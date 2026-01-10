"""
Link Parser Service

Extracts metadata from URLs (TikTok, Instagram, Google Maps, etc.)
"""

import httpx
from bs4 import BeautifulSoup
import re
import json
from typing import Optional, List
from urllib.parse import urlparse, unquote
from sqlalchemy.orm import Session

from app.schemas.schemas import ParsedLinkResponse


async def parse_link(url: str, db: Session) -> ParsedLinkResponse:
    """
    Parse a URL and extract metadata.
    """
    
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc.lower()
        
        if 'tiktok.com' in domain:
            result = await parse_tiktok(url)
        elif 'instagram.com' in domain:
            result = await parse_instagram(url)
        elif 'google.com/maps' in url or 'maps.google' in domain:
            result = await parse_google_maps(url)
        elif 'yelp.com' in domain:
            result = await parse_yelp(url)
        elif 'reddit.com' in domain:
            result = await parse_reddit(url)
        elif 'eventbrite.com' in domain:
            result = await parse_eventbrite(url)
        elif 'ticketmaster.com' in domain:
            result = await parse_ticketmaster(url)
        else:
            result = await parse_generic(url)
        
        result['source_link'] = url
        return ParsedLinkResponse(**result)
        
    except Exception as e:
        print(f"Link parsing error: {e}")
        return ParsedLinkResponse(success=False, source_link=url)


async def fetch_page(url: str) -> Optional[str]:
    """Fetch a web page."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    }
    
    async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
        response = await client.get(url, headers=headers)
        response.raise_for_status()
        return response.text


def extract_og_tags(soup: BeautifulSoup) -> dict:
    """Extract Open Graph meta tags."""
    og_data = {}
    for meta in soup.find_all('meta'):
        prop = meta.get('property', '') or meta.get('name', '')
        content = meta.get('content', '')
        if prop.startswith('og:'):
            og_data[prop[3:]] = content
    return og_data


def extract_location_hint(text: str) -> Optional[str]:
    """Try to extract location from text."""
    if not text:
        return None
    
    patterns = [
        r'📍\s*([^📍\n]+)',
        r'at\s+([A-Z][^,.\n]+)',
        r'@\s*([A-Z][^,.\n]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            location = match.group(1).strip()
            if 3 < len(location) < 100:
                return location
    return None


async def parse_tiktok(url: str) -> dict:
    """Parse TikTok video URL."""
    try:
        html = await fetch_page(url)
        soup = BeautifulSoup(html, 'html.parser')
        
        title = None
        images = []
        
        for script in soup.find_all('script'):
            if script.string and '__UNIVERSAL_DATA_FOR_REHYDRATION__' in script.string:
                match = re.search(r"window\['__UNIVERSAL_DATA_FOR_REHYDRATION__'\]\s*=\s*({.+?});", script.string)
                if match:
                    try:
                        data = json.loads(match.group(1))
                        item = data.get('__DEFAULT_SCOPE__', {}).get('webapp.video-detail', {}).get('itemInfo', {}).get('itemStruct', {})
                        title = item.get('desc', '')
                        cover = item.get('video', {}).get('cover', '')
                        if cover:
                            images.append(cover)
                    except:
                        pass
        
        if not title:
            og = extract_og_tags(soup)
            title = og.get('title', og.get('description', ''))
            if og.get('image'):
                images = [og['image']]
        
        return {
            'success': bool(title),
            'title': title,
            'images': images,
            'location_hint': extract_location_hint(title)
        }
    except Exception as e:
        print(f"TikTok error: {e}")
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}


async def parse_instagram(url: str) -> dict:
    """Parse Instagram post URL."""
    try:
        html = await fetch_page(url)
        soup = BeautifulSoup(html, 'html.parser')
        og = extract_og_tags(soup)
        
        title = og.get('title', og.get('description', ''))
        images = [og['image']] if og.get('image') else []
        
        return {
            'success': bool(title or images),
            'title': title,
            'images': images,
            'location_hint': extract_location_hint(title)
        }
    except Exception as e:
        print(f"Instagram error: {e}")
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}


async def parse_google_maps(url: str) -> dict:
    """Parse Google Maps URL."""
    try:
        match = re.search(r'/place/([^/]+)', url)
        if match:
            place_name = unquote(match.group(1)).replace('+', ' ')
            return {
                'success': True,
                'title': place_name,
                'images': [],
                'location_hint': place_name
            }
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}
    except Exception as e:
        print(f"Maps error: {e}")
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}


async def parse_yelp(url: str) -> dict:
    """Parse Yelp business URL."""
    try:
        match = re.search(r'/biz/([^?]+)', url)
        if match:
            slug = match.group(1)
            parts = slug.rsplit('-', 2)
            if len(parts) > 2:
                slug = '-'.join(parts[:-2])
            business_name = slug.replace('-', ' ').title()
            
            html = await fetch_page(url)
            soup = BeautifulSoup(html, 'html.parser')
            og = extract_og_tags(soup)
            
            title = og.get('title', business_name)
            if ' - Yelp' in title:
                title = title.split(' - Yelp')[0]
            
            images = [og['image']] if og.get('image') else []
            
            return {
                'success': True,
                'title': title,
                'images': images,
                'location_hint': title
            }
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}
    except Exception as e:
        print(f"Yelp error: {e}")
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}


async def parse_reddit(url: str) -> dict:
    """Parse Reddit post URL."""
    try:
        json_url = url.rstrip('/') + '.json'
        async with httpx.AsyncClient(follow_redirects=True, timeout=10.0) as client:
            response = await client.get(json_url, headers={'User-Agent': 'Drift/1.0'})
            data = response.json()
        
        if data and len(data) > 0:
            post = data[0]['data']['children'][0]['data']
            title = post.get('title', '')
            images = []
            if post.get('post_hint') == 'image':
                images = [post.get('url', '')]
            elif post.get('thumbnail', '').startswith('http'):
                images = [post['thumbnail']]
            
            return {
                'success': True,
                'title': title,
                'images': images,
                'location_hint': extract_location_hint(title + ' ' + post.get('selftext', ''))
            }
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}
    except Exception as e:
        print(f"Reddit error: {e}")
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}


async def parse_eventbrite(url: str) -> dict:
    """Parse Eventbrite event URL."""
    try:
        html = await fetch_page(url)
        soup = BeautifulSoup(html, 'html.parser')
        
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                if data.get('@type') == 'Event':
                    return {
                        'success': True,
                        'title': data.get('name', ''),
                        'images': [data.get('image', '')] if data.get('image') else [],
                        'location_hint': data.get('location', {}).get('name', '')
                    }
            except:
                continue
        
        og = extract_og_tags(soup)
        return {
            'success': bool(og.get('title')),
            'title': og.get('title', ''),
            'images': [og['image']] if og.get('image') else [],
            'location_hint': None
        }
    except Exception as e:
        print(f"Eventbrite error: {e}")
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}


async def parse_ticketmaster(url: str) -> dict:
    """Parse Ticketmaster event URL."""
    try:
        html = await fetch_page(url)
        soup = BeautifulSoup(html, 'html.parser')
        
        for script in soup.find_all('script', type='application/ld+json'):
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    data = data[0]
                if data.get('@type') == 'Event':
                    return {
                        'success': True,
                        'title': data.get('name', ''),
                        'images': [data.get('image', '')] if data.get('image') else [],
                        'location_hint': data.get('location', {}).get('name', '')
                    }
            except:
                continue
        
        og = extract_og_tags(soup)
        return {
            'success': bool(og.get('title')),
            'title': og.get('title', ''),
            'images': [og['image']] if og.get('image') else [],
            'location_hint': None
        }
    except Exception as e:
        print(f"Ticketmaster error: {e}")
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}


async def parse_generic(url: str) -> dict:
    """Generic parser using Open Graph tags."""
    try:
        html = await fetch_page(url)
        soup = BeautifulSoup(html, 'html.parser')
        og = extract_og_tags(soup)
        
        title = og.get('title', '')
        if not title:
            title_tag = soup.find('title')
            if title_tag:
                title = title_tag.string or ''
        
        images = [og['image']] if og.get('image') else []
        
        return {
            'success': bool(title or images),
            'title': title,
            'images': images,
            'location_hint': extract_location_hint(og.get('description', ''))
        }
    except Exception as e:
        print(f"Generic error: {e}")
        return {'success': False, 'title': None, 'images': [], 'location_hint': None}
