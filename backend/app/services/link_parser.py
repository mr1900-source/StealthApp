"""
Enhanced Link Parser Service

Parses links from multiple sources to extract place/event information.
Supports: Google Maps, Yelp, TikTok, Instagram, Eventbrite, OpenTable,
YouTube, Facebook, TripAdvisor, Resy, Foursquare, Airbnb, and any generic website.
"""

import os
import re
import json
import logging
import httpx
from urllib.parse import urlparse, parse_qs, unquote
from typing import Optional, Dict, Any, List
from bs4 import BeautifulSoup
from ..models.save import SaveCategory, SaveSourceType
from ..schemas.save import ParsedLinkResponse

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Connection": "keep-alive",
}

TIMEOUT = 15


class LinkParser:
    """Enhanced link parser that extracts structured data from URLs."""
    
    @classmethod
    async def parse(cls, url: str) -> ParsedLinkResponse:
        """Main entry point - detect URL type and parse accordingly."""
        if not url:
            return ParsedLinkResponse(success=False, error="No URL provided")
        
        url = url.strip()
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        
        domain = urlparse(url).netloc.lower()
        
        try:
            if any(x in url.lower() for x in ['google.com/maps', 'goo.gl/maps', 'maps.app.goo.gl']):
                return await cls._parse_google_maps(url)
            if 'tiktok.com' in domain:
                return await cls._parse_tiktok(url)
            if 'instagram.com' in domain:
                return await cls._parse_instagram(url)
            if 'facebook.com' in domain or 'fb.watch' in domain:
                return await cls._parse_generic_social(url, "Facebook")
            if 'youtube.com' in domain or 'youtu.be' in domain:
                return await cls._parse_youtube(url)
            if 'yelp.com' in domain:
                return await cls._parse_yelp(url)
            if 'opentable.com' in domain:
                return await cls._parse_restaurant_platform(url, "OpenTable")
            if 'resy.com' in domain:
                return await cls._parse_restaurant_platform(url, "Resy")
            if 'tripadvisor.com' in domain:
                return await cls._parse_tripadvisor(url)
            if 'eventbrite.com' in domain:
                return await cls._parse_eventbrite(url)
            if 'airbnb.com' in domain:
                return await cls._parse_airbnb(url)
            if 'reddit.com' in domain:
                return await cls._parse_reddit(url)
            
            return await cls._parse_generic(url)
        except Exception as e:
            logger.error(f"Error parsing {url}: {e}")
            try:
                return await cls._parse_generic(url)
            except:
                return ParsedLinkResponse(success=False, error=str(e))
    
    @classmethod
    async def _fetch_page(cls, url: str) -> tuple:
        """Fetch a page and return (html, final_url)."""
        try:
            async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True, timeout=TIMEOUT) as client:
                response = await client.get(url)
                return response.text, str(response.url)
        except Exception as e:
            logger.warning(f"Failed to fetch {url}: {e}")
            return None, None
    
    @classmethod
    def _extract_og(cls, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract Open Graph and meta tags."""
        data = {}
        for tag in soup.find_all('meta', property=True):
            if tag.get('property', '').startswith('og:'):
                data[tag['property'][3:]] = tag.get('content', '')
        
        for tag in soup.find_all('meta', attrs={'name': True}):
            if tag.get('name', '').startswith('twitter:'):
                key = tag['name'][8:]
                if key not in data:
                    data[key] = tag.get('content', '')
        
        if 'title' not in data:
            title_tag = soup.find('title')
            if title_tag:
                data['title'] = title_tag.get_text().strip()
        
        if 'description' not in data:
            desc = soup.find('meta', attrs={'name': 'description'})
            if desc:
                data['description'] = desc.get('content', '')
        
        return data
    
    @classmethod
    def _extract_json_ld(cls, soup: BeautifulSoup) -> List[Dict]:
        """Extract JSON-LD structured data."""
        results = []
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    results.extend(data)
                else:
                    results.append(data)
            except:
                pass
        return results
    
    @classmethod
    def _infer_category(cls, text: str) -> SaveCategory:
        """Infer category from text."""
        if not text:
            return SaveCategory.OTHER
        t = text.lower()
        
        if any(w in t for w in ['restaurant', 'dining', 'food', 'eat', 'dinner', 'lunch', 'brunch', 'sushi', 'pizza', 'bistro']):
            return SaveCategory.RESTAURANT
        if any(w in t for w in ['bar', 'cocktail', 'pub', 'brewery', 'wine', 'lounge', 'nightlife']):
            return SaveCategory.BAR
        if any(w in t for w in ['cafe', 'café', 'coffee', 'espresso', 'bakery', 'tea']):
            return SaveCategory.CAFE
        if any(w in t for w in ['concert', 'live music', 'show', 'tour', 'festival', 'band']):
            return SaveCategory.CONCERT
        if any(w in t for w in ['event', 'party', 'meetup', 'workshop', 'class', 'exhibition']):
            return SaveCategory.EVENT
        if any(w in t for w in ['activity', 'tour', 'hike', 'sport', 'museum', 'gallery', 'adventure']):
            return SaveCategory.ACTIVITY
        if any(w in t for w in ['hotel', 'resort', 'airbnb', 'vacation', 'stay', 'lodge']):
            return SaveCategory.TRIP
        return SaveCategory.OTHER
    
    @classmethod
    def _get_address(cls, addr: Any) -> Optional[str]:
        """Extract address from JSON-LD."""
        if isinstance(addr, str):
            return addr
        if isinstance(addr, dict):
            parts = [addr.get('streetAddress', ''), addr.get('addressLocality', ''),
                     addr.get('addressRegion', ''), addr.get('postalCode', '')]
            return ', '.join(p for p in parts if p)
        return None

    # ==================== GOOGLE MAPS ====================
    
    @classmethod
    async def _parse_google_maps(cls, url: str) -> ParsedLinkResponse:
        """Parse Google Maps URLs using the new Places API."""
        try:
            html, final_url = await cls._fetch_page(url)
            url = final_url or url

            # Extract place title from URL if possible
            match = re.search(r'/place/([^/@]+)', unquote(url))
            title_from_url = match.group(1).replace('+', ' ') if match else None

            # Try to get coordinates from URL for location bias
            coord_match = re.search(r'@(-?\d+\.?\d*),(-?\d+\.?\d*)', url)
            lat, lng = (float(coord_match.group(1)), float(coord_match.group(2))) if coord_match else (None, None)

            google_api_key = os.getenv('GOOGLE_PLACES_API_KEY')
            if not google_api_key:
                return ParsedLinkResponse(success=False, error="Google Places API key not set")

            # Build the POST body
            body = {
                "textQuery": title_from_url or "",
            }
            if lat and lng:
                body["locationBias"] = {
                    "circle": {
                        "center": {"latitude": lat, "longitude": lng},
                        "radius": 500
                    }
                }

            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.post(
                    "https://places.googleapis.com/v1/places:searchText",
                    headers={
                        "Content-Type": "application/json",
                        "X-Goog-Api-Key": google_api_key,
                        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location",
                    },
                    json=body
                )
                data = response.json()

            if not data.get("places"):
                return ParsedLinkResponse(success=False, error="No result from Places API")

            place = data["places"][0]

            title = place.get("displayName", {}).get("text") or title_from_url
            location_name = place.get("formattedAddress")
            lat = place.get("location", {}).get("latitude", lat)
            lng = place.get("location", {}).get("longitude", lng)

            category = cls._infer_category(title or "")

            return ParsedLinkResponse(
                success=True,
                source_type=SaveSourceType.GOOGLE_MAPS,
                title=title,
                location_name=location_name,
                address=location_name,
                location_lat=lat,
                location_lng=lng,
                category=category
            )

        except Exception as e:
            return ParsedLinkResponse(success=False, source_type=SaveSourceType.GOOGLE_MAPS, error=str(e))

    # ==================== YELP ====================
    
    @classmethod
    async def _parse_yelp(cls, url: str) -> ParsedLinkResponse:
        """Parse Yelp URLs."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(success=False, error="Could not fetch page")
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '').replace(' - Yelp', '').strip()
            desc = og.get('description', '')
            image = og.get('image', '')
            address, lat, lng = None, None, None
            
            for item in cls._extract_json_ld(soup):
                if item.get('@type') in ['Restaurant', 'LocalBusiness', 'FoodEstablishment', 'BarOrPub']:
                    title = title or item.get('name', '')
                    address = cls._get_address(item.get('address'))
                    geo = item.get('geo', {})
                    lat, lng = geo.get('latitude'), geo.get('longitude')
                    break
            
            cat = cls._infer_category(f"{title} {desc}")
            if cat == SaveCategory.OTHER:
                cat = SaveCategory.RESTAURANT
            
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.OTHER_URL,
                title=title[:200] if title else None, description=desc[:500] if desc else None,
                address=address, location_lat=lat, location_lng=lng,
                image_url=image, category=cat
            )
        except Exception as e:
            return ParsedLinkResponse(success=False, error=str(e))

    # ==================== TIKTOK ====================
    
    @classmethod
    async def _parse_tiktok(cls, url: str) -> ParsedLinkResponse:
        """Parse TikTok URLs - extracts caption and metadata."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(
                    success=True, source_type=SaveSourceType.TIKTOK,
                    error="TikTok content detected. Please add details manually."
                )
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '')
            desc = og.get('description', '')
            image = og.get('image', '')
            
            for script in soup.find_all('script', id='__UNIVERSAL_DATA_FOR_REHYDRATION__'):
                try:
                    data = json.loads(script.string)
                    scope = data.get('__DEFAULT_SCOPE__', {})
                    video = scope.get('webapp.video-detail', {}).get('itemInfo', {}).get('itemStruct', {})
                    if video:
                        desc = video.get('desc', desc)
                        if not title and desc:
                            title = desc.split('\n')[0][:100]
                        challenges = video.get('challenges', [])
                        tags = ' '.join(c.get('title', '') for c in challenges)
                        desc = f"{desc} {tags}"
                except:
                    pass
            
            for script in soup.find_all('script', id='SIGI_STATE'):
                try:
                    data = json.loads(script.string)
                    for vid in data.get('ItemModule', {}).values():
                        desc = vid.get('desc', desc)
                        if not title:
                            title = desc[:100] if desc else ''
                        break
                except:
                    pass
            
            if title:
                title = re.sub(r'\s*\|\s*TikTok.*$', '', title).strip()
                title = re.sub(r'^.+?\s+on\s+TikTok\s*', '', title).strip()
            
            cat = cls._infer_category(f"{title} {desc}")
            
            if title or desc:
                return ParsedLinkResponse(
                    success=True, source_type=SaveSourceType.TIKTOK,
                    title=title[:200] if title else None,
                    description=desc[:500] if desc else None,
                    image_url=image,
                    category=cat if cat != SaveCategory.OTHER else None
                )
            
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.TIKTOK,
                error="TikTok content detected. Please add details manually."
            )
        except Exception as e:
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.TIKTOK,
                error="TikTok content detected. Please add details manually."
            )

    # ==================== INSTAGRAM ====================
    
    @classmethod
    async def _parse_instagram(cls, url: str) -> ParsedLinkResponse:
        """Parse Instagram URLs."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(
                    success=True, source_type=SaveSourceType.INSTAGRAM,
                    error="Instagram content detected. Please add details manually."
                )
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '')
            desc = og.get('description', '')
            image = og.get('image', '')
            location = None
            
            match = re.search(r'on Instagram:\s*[""\'"](.+?)[""\'"]', title, re.DOTALL)
            if match:
                title = match.group(1)[:200]
            
            loc_match = re.search(r'at\s+([^.]+?)\.', desc)
            if loc_match:
                location = loc_match.group(1).strip()
            
            cat = cls._infer_category(f"{title} {desc}")
            
            if title or desc:
                return ParsedLinkResponse(
                    success=True, source_type=SaveSourceType.INSTAGRAM,
                    title=title[:200] if title else None,
                    description=desc[:500] if desc else None,
                    location_name=location, image_url=image,
                    category=cat if cat != SaveCategory.OTHER else None
                )
            
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.INSTAGRAM,
                error="Instagram content detected. Please add details manually."
            )
        except:
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.INSTAGRAM,
                error="Instagram content detected. Please add details manually."
            )

    # ==================== YOUTUBE ====================
    
    @classmethod
    async def _parse_youtube(cls, url: str) -> ParsedLinkResponse:
        """Parse YouTube URLs."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(success=False, error="Could not fetch page")
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '')
            desc = og.get('description', '')
            image = og.get('image', '')
            
            for script in soup.find_all('script'):
                if script.string and 'ytInitialPlayerResponse' in script.string:
                    try:
                        match = re.search(r'ytInitialPlayerResponse\s*=\s*({.+?});', script.string)
                        if match:
                            data = json.loads(match.group(1))
                            details = data.get('videoDetails', {})
                            title = title or details.get('title', '')
                            desc = desc or details.get('shortDescription', '')
                    except:
                        pass
                    break
            
            cat = cls._infer_category(f"{title} {desc}")
            
            return ParsedLinkResponse(
                success=True if title else False,
                source_type=SaveSourceType.OTHER_URL,
                title=title[:200] if title else None,
                description=desc[:500] if desc else None,
                image_url=image,
                category=cat if cat != SaveCategory.OTHER else None
            )
        except Exception as e:
            return ParsedLinkResponse(success=False, error=str(e))

    # ==================== EVENTBRITE ====================
    
    @classmethod
    async def _parse_eventbrite(cls, url: str) -> ParsedLinkResponse:
        """Parse Eventbrite URLs."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(success=False, error="Could not fetch page")
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '').replace(' | Eventbrite', '').strip()
            desc = og.get('description', '')
            image = og.get('image', '')
            address, lat, lng = None, None, None
            
            for item in cls._extract_json_ld(soup):
                if item.get('@type') == 'Event':
                    title = title or item.get('name', '')
                    desc = desc or item.get('description', '')
                    
                    loc = item.get('location', {})
                    if isinstance(loc, dict):
                        venue = loc.get('name', '')
                        addr = cls._get_address(loc.get('address'))
                        address = f"{venue}, {addr}" if venue and addr else (venue or addr)
                        geo = loc.get('geo', {})
                        lat, lng = geo.get('latitude'), geo.get('longitude')
                    break
            
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.EVENTBRITE,
                title=title[:200] if title else None,
                description=desc[:500] if desc else None,
                address=address, location_lat=lat, location_lng=lng,
                image_url=image, category=SaveCategory.EVENT
            )
        except Exception as e:
            return ParsedLinkResponse(success=False, error=str(e))

    # ==================== RESTAURANT PLATFORMS ====================
    
    @classmethod
    async def _parse_restaurant_platform(cls, url: str, platform: str) -> ParsedLinkResponse:
        """Parse OpenTable, Resy, etc."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(success=False, error="Could not fetch page")
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '').replace(f' | {platform}', '').strip()
            desc = og.get('description', '')
            image = og.get('image', '')
            address = None
            
            for item in cls._extract_json_ld(soup):
                if item.get('@type') in ['Restaurant', 'LocalBusiness']:
                    title = title or item.get('name', '')
                    address = cls._get_address(item.get('address'))
                    break
            
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.OTHER_URL,
                title=title[:200] if title else None,
                description=desc[:500] if desc else None,
                address=address, image_url=image,
                category=SaveCategory.RESTAURANT
            )
        except Exception as e:
            return ParsedLinkResponse(success=False, error=str(e))

    # ==================== TRIPADVISOR ====================
    
    @classmethod
    async def _parse_tripadvisor(cls, url: str) -> ParsedLinkResponse:
        """Parse TripAdvisor URLs."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(success=False, error="Could not fetch page")
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '').split(' - ')[0].strip()
            desc = og.get('description', '')
            image = og.get('image', '')
            address, cat = None, SaveCategory.OTHER
            
            for item in cls._extract_json_ld(soup):
                t = item.get('@type', '')
                if t in ['Restaurant', 'Hotel', 'LocalBusiness', 'TouristAttraction']:
                    title = title or item.get('name', '')
                    address = cls._get_address(item.get('address'))
                    cat = SaveCategory.TRIP if t == 'Hotel' else (
                        SaveCategory.RESTAURANT if t == 'Restaurant' else SaveCategory.ACTIVITY)
                    break
            
            if cat == SaveCategory.OTHER:
                cat = cls._infer_category(f"{title} {desc}")
            
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.OTHER_URL,
                title=title[:200] if title else None,
                description=desc[:500] if desc else None,
                address=address, image_url=image, category=cat
            )
        except Exception as e:
            return ParsedLinkResponse(success=False, error=str(e))

    # ==================== AIRBNB ====================
    
    @classmethod
    async def _parse_airbnb(cls, url: str) -> ParsedLinkResponse:
        """Parse Airbnb URLs."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(success=False, error="Could not fetch page")
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '').replace(' - Airbnb', '').strip()
            desc = og.get('description', '')
            image = og.get('image', '')
            location = None
            
            if ' in ' in title:
                parts = title.rsplit(' in ', 1)
                if len(parts) > 1:
                    location = parts[1]
            
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.OTHER_URL,
                title=title[:200] if title else None,
                description=desc[:500] if desc else None,
                location_name=location, image_url=image,
                category=SaveCategory.TRIP
            )
        except Exception as e:
            return ParsedLinkResponse(success=False, error=str(e))

    # ==================== REDDIT ====================
    
    @classmethod
    async def _parse_reddit(cls, url: str) -> ParsedLinkResponse:
        """Parse Reddit URLs."""
        try:
            json_url = url.rstrip('/') + '.json'
            async with httpx.AsyncClient(headers={'User-Agent': 'Drift/1.0'}, timeout=10) as client:
                resp = await client.get(json_url)
                if resp.status_code == 200:
                    data = resp.json()
                    if data:
                        post = data[0]['data']['children'][0]['data']
                        title = post.get('title', '')
                        desc = post.get('selftext', '')[:500]
                        cat = cls._infer_category(f"{title} {desc}")
                        return ParsedLinkResponse(
                            success=True, source_type=SaveSourceType.REDDIT,
                            title=title[:200] if title else None,
                            description=desc if desc else None,
                            category=cat if cat != SaveCategory.OTHER else None
                        )
            return ParsedLinkResponse(success=False, source_type=SaveSourceType.REDDIT, error="Could not parse")
        except Exception as e:
            return ParsedLinkResponse(success=False, error=str(e))

    # ==================== GENERIC SOCIAL ====================
    
    @classmethod
    async def _parse_generic_social(cls, url: str, platform: str) -> ParsedLinkResponse:
        """Parse Facebook and other social platforms."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(
                    success=True, source_type=SaveSourceType.OTHER_URL,
                    error=f"{platform} content detected. Please add details manually."
                )
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '')
            desc = og.get('description', '')
            image = og.get('image', '')
            address = None
            
            for item in cls._extract_json_ld(soup):
                if item.get('@type') in ['Restaurant', 'LocalBusiness', 'Place', 'Event']:
                    title = title or item.get('name', '')
                    address = cls._get_address(item.get('address'))
                    break
            
            cat = cls._infer_category(f"{title} {desc}")
            
            return ParsedLinkResponse(
                success=True if title else False,
                source_type=SaveSourceType.OTHER_URL,
                title=title[:200] if title else None,
                description=desc[:500] if desc else None,
                address=address, image_url=image,
                category=cat if cat != SaveCategory.OTHER else None,
                error=None if title else f"Could not extract from {platform}"
            )
        except:
            return ParsedLinkResponse(
                success=True, source_type=SaveSourceType.OTHER_URL,
                error=f"{platform} content detected. Please add details manually."
            )

    # ==================== GENERIC ====================
    
    @classmethod
    async def _parse_generic(cls, url: str) -> ParsedLinkResponse:
        """Parse any website using Open Graph and JSON-LD."""
        try:
            html, _ = await cls._fetch_page(url)
            if not html:
                return ParsedLinkResponse(success=False, error="Could not fetch page")
            
            soup = BeautifulSoup(html, 'html.parser')
            og = cls._extract_og(soup)
            
            title = og.get('title', '')
            desc = og.get('description', '')
            image = og.get('image', '')
            address, lat, lng = None, None, None
            cat = SaveCategory.OTHER
            
            for item in cls._extract_json_ld(soup):
                t = item.get('@type', '')
                
                if t in ['Restaurant', 'LocalBusiness', 'FoodEstablishment', 'BarOrPub', 'CafeOrCoffeeShop']:
                    title = title or item.get('name', '')
                    address = cls._get_address(item.get('address'))
                    geo = item.get('geo', {})
                    lat, lng = geo.get('latitude'), geo.get('longitude')
                    cat = {'Restaurant': SaveCategory.RESTAURANT, 'BarOrPub': SaveCategory.BAR,
                           'CafeOrCoffeeShop': SaveCategory.CAFE}.get(t, SaveCategory.RESTAURANT)
                    break
                
                elif t == 'Event':
                    title = title or item.get('name', '')
                    desc = desc or item.get('description', '')
                    loc = item.get('location', {})
                    if isinstance(loc, dict):
                        address = loc.get('name', '') or cls._get_address(loc.get('address'))
                    cat = SaveCategory.EVENT
                    break
                
                elif t in ['Hotel', 'LodgingBusiness']:
                    title = title or item.get('name', '')
                    cat = SaveCategory.TRIP
                    break
                
                elif t == 'Place':
                    title = title or item.get('name', '')
                    address = cls._get_address(item.get('address'))
                    break
            
            if cat == SaveCategory.OTHER:
                cat = cls._infer_category(f"{title} {desc}")
            
            return ParsedLinkResponse(
                success=True if title else False,
                source_type=SaveSourceType.OTHER_URL,
                title=title[:200] if title else None,
                description=desc[:500] if desc else None,
                address=address, location_lat=lat, location_lng=lng,
                image_url=image, category=cat if cat != SaveCategory.OTHER else None,
                error=None if title else "Could not extract details from URL"
            )
        except Exception as e:
            return ParsedLinkResponse(success=False, source_type=SaveSourceType.OTHER_URL, error=str(e))
