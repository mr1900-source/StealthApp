import re
import httpx
from urllib.parse import urlparse, parse_qs, unquote
from typing import Optional, Dict, Any
from bs4 import BeautifulSoup
from ..models.save import SaveCategory, SaveSourceType
from ..schemas.save import ParsedLinkResponse


class LinkParser:
    """Parse various URL types to extract place/event information."""
    
    @classmethod
    async def parse(cls, url: str) -> ParsedLinkResponse:
        """Main entry point - detect URL type and parse accordingly."""
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()
        
        # Detect source type based on domain
        if "google.com/maps" in url or "goo.gl/maps" in url or "maps.app.goo.gl" in url:
            return await cls._parse_google_maps(url)
        elif "eventbrite" in domain:
            return await cls._parse_eventbrite(url)
        elif "yelp.com" in domain:
            return await cls._parse_yelp(url)
        elif "tiktok.com" in domain:
            return cls._parse_tiktok(url)
        elif "instagram.com" in domain:
            return cls._parse_instagram(url)
        elif "reddit.com" in domain:
            return await cls._parse_reddit(url)
        else:
            # Generic URL - try to extract basic metadata
            return await cls._parse_generic(url)
    
    @classmethod
    async def _parse_google_maps(cls, url: str) -> ParsedLinkResponse:
        """Parse Google Maps URLs to extract place info."""
        try:
            # Handle different Google Maps URL formats
            # Format 1: https://www.google.com/maps/place/Place+Name/@lat,lng,zoom
            # Format 2: https://maps.app.goo.gl/shortcode
            # Format 3: https://www.google.com/maps?q=lat,lng
            
            # Try to follow redirects for shortened URLs
            if "goo.gl" in url:
                async with httpx.AsyncClient(follow_redirects=True) as client:
                    response = await client.head(url, timeout=10)
                    url = str(response.url)
            
            parsed = urlparse(url)
            path = unquote(parsed.path)
            
            title = None
            lat = None
            lng = None
            
            # Extract place name from path
            place_match = re.search(r'/place/([^/@]+)', path)
            if place_match:
                title = place_match.group(1).replace('+', ' ').replace('%20', ' ')
            
            # Extract coordinates
            coord_match = re.search(r'@(-?\d+\.?\d*),(-?\d+\.?\d*)', path)
            if coord_match:
                lat = float(coord_match.group(1))
                lng = float(coord_match.group(2))
            
            # Also check query params
            if not lat or not lng:
                query_params = parse_qs(parsed.query)
                if 'q' in query_params:
                    q = query_params['q'][0]
                    coord_match = re.search(r'(-?\d+\.?\d*),(-?\d+\.?\d*)', q)
                    if coord_match:
                        lat = float(coord_match.group(1))
                        lng = float(coord_match.group(2))
            
            if title or (lat and lng):
                return ParsedLinkResponse(
                    success=True,
                    source_type=SaveSourceType.GOOGLE_MAPS,
                    title=title,
                    location_lat=lat,
                    location_lng=lng,
                    category=SaveCategory.OTHER
                )
            
            return ParsedLinkResponse(
                success=False,
                source_type=SaveSourceType.GOOGLE_MAPS,
                error="Could not extract place info from Google Maps URL"
            )
            
        except Exception as e:
            return ParsedLinkResponse(
                success=False,
                source_type=SaveSourceType.GOOGLE_MAPS,
                error=str(e)
            )
    
    @classmethod
    async def _parse_eventbrite(cls, url: str) -> ParsedLinkResponse:
        """Parse Eventbrite URLs to extract event info."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract title
                title = None
                title_tag = soup.find('h1') or soup.find('meta', property='og:title')
                if title_tag:
                    title = title_tag.get('content') if hasattr(title_tag, 'get') else title_tag.text.strip()
                
                # Extract description
                description = None
                desc_tag = soup.find('meta', property='og:description')
                if desc_tag:
                    description = desc_tag.get('content')
                
                # Extract image
                image_url = None
                img_tag = soup.find('meta', property='og:image')
                if img_tag:
                    image_url = img_tag.get('content')
                
                # Extract location from structured data if available
                location_name = None
                address = None
                location_tag = soup.find('meta', property='event:location:address')
                if location_tag:
                    address = location_tag.get('content')
                
                return ParsedLinkResponse(
                    success=True,
                    source_type=SaveSourceType.EVENTBRITE,
                    title=title,
                    description=description,
                    category=SaveCategory.EVENT,
                    location_name=location_name,
                    address=address,
                    image_url=image_url
                )
                
        except Exception as e:
            return ParsedLinkResponse(
                success=False,
                source_type=SaveSourceType.EVENTBRITE,
                error=str(e)
            )
    
    @classmethod
    async def _parse_yelp(cls, url: str) -> ParsedLinkResponse:
        """Parse Yelp URLs to extract business info."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                title = None
                title_tag = soup.find('h1') or soup.find('meta', property='og:title')
                if title_tag:
                    title = title_tag.get('content') if hasattr(title_tag, 'get') else title_tag.text.strip()
                
                image_url = None
                img_tag = soup.find('meta', property='og:image')
                if img_tag:
                    image_url = img_tag.get('content')
                
                # Determine category from URL path
                category = SaveCategory.OTHER
                if '/restaurants/' in url or '/food/' in url:
                    category = SaveCategory.RESTAURANT
                elif '/bars/' in url or '/nightlife/' in url:
                    category = SaveCategory.BAR
                elif '/coffee/' in url:
                    category = SaveCategory.CAFE
                
                return ParsedLinkResponse(
                    success=True,
                    source_type=SaveSourceType.OTHER_URL,
                    title=title,
                    category=category,
                    image_url=image_url
                )
                
        except Exception as e:
            return ParsedLinkResponse(
                success=False,
                source_type=SaveSourceType.OTHER_URL,
                error=str(e)
            )
    
    @classmethod
    def _parse_tiktok(cls, url: str) -> ParsedLinkResponse:
        """
        TikTok URLs - we can't easily extract content due to API restrictions.
        Return partial success and ask user to fill in details.
        """
        return ParsedLinkResponse(
            success=True,
            source_type=SaveSourceType.TIKTOK,
            title=None,  # User needs to add
            error="TikTok content detected. Please add the place name manually."
        )
    
    @classmethod
    def _parse_instagram(cls, url: str) -> ParsedLinkResponse:
        """
        Instagram URLs - limited extraction without API.
        Return partial success.
        """
        return ParsedLinkResponse(
            success=True,
            source_type=SaveSourceType.INSTAGRAM,
            title=None,
            error="Instagram content detected. Please add the place name manually."
        )
    
    @classmethod
    async def _parse_reddit(cls, url: str) -> ParsedLinkResponse:
        """Parse Reddit URLs - try to extract from post title."""
        try:
            # Add .json to get Reddit API response
            json_url = url.rstrip('/') + '.json'
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    json_url,
                    timeout=10,
                    headers={'User-Agent': 'Drift/1.0'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data and len(data) > 0:
                        post = data[0]['data']['children'][0]['data']
                        title = post.get('title')
                        
                        return ParsedLinkResponse(
                            success=True,
                            source_type=SaveSourceType.REDDIT,
                            title=title,
                            description=post.get('selftext', '')[:500] if post.get('selftext') else None
                        )
            
            return ParsedLinkResponse(
                success=False,
                source_type=SaveSourceType.REDDIT,
                error="Could not parse Reddit post"
            )
            
        except Exception as e:
            return ParsedLinkResponse(
                success=False,
                source_type=SaveSourceType.REDDIT,
                error=str(e)
            )
    
    @classmethod
    async def _parse_generic(cls, url: str) -> ParsedLinkResponse:
        """Parse generic URLs using Open Graph tags."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Try Open Graph tags first
                title = None
                og_title = soup.find('meta', property='og:title')
                if og_title:
                    title = og_title.get('content')
                else:
                    title_tag = soup.find('title')
                    if title_tag:
                        title = title_tag.text.strip()
                
                description = None
                og_desc = soup.find('meta', property='og:description')
                if og_desc:
                    description = og_desc.get('content')
                
                image_url = None
                og_image = soup.find('meta', property='og:image')
                if og_image:
                    image_url = og_image.get('content')
                
                return ParsedLinkResponse(
                    success=True if title else False,
                    source_type=SaveSourceType.OTHER_URL,
                    title=title,
                    description=description,
                    image_url=image_url,
                    error=None if title else "Could not extract title from URL"
                )
                
        except Exception as e:
            return ParsedLinkResponse(
                success=False,
                source_type=SaveSourceType.OTHER_URL,
                error=str(e)
            )
