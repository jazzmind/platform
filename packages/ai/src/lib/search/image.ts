// lib/imageSearch.js
import { searchPerplexity, searchGoogle, isUrlAccessible } from './base';

interface GoogleSearchItem {
  title: string;
  link: string;
  image?: {
    contextLink?: string;
    thumbnailLink?: string;
  };
  mime?: string;
}

interface AIImage {
  url: string;
  alt: string;
  source: string;
  license?: string;
}

async function isImageAccessible(url: string): Promise<boolean> {
  return isUrlAccessible(url, "image/");
}

async function filterAccessibleImages(images: AIImage[]): Promise<AIImage[]> {
  if (!images) {
    return [];
  }
  // Validate image accessibility in parallel
  const validationPromises = images.map(async (image: AIImage) => ({
    ...image,
    isAccessible: await isImageAccessible(image.url)
  }));

  const validatedImages = await Promise.all(validationPromises);
  const accessibleImages = validatedImages
    .filter(image => image.isAccessible)
    .map(({ ...image }) => image)
    .slice(0, 6);
  return accessibleImages;
}

// check google first, then perplexity
async function searchImages(query: string): Promise<AIImage[]> {
  let images: AIImage[] = [];

  const googleImages = await getGoogleHeadshotImages(query, 6);
  if (googleImages.length > 3) {
    return googleImages;
  }
 
  const perplexityImages = await getPerplexityHeadshotImages(query, 6);
  // append perplexity
  images = [...images, ...perplexityImages];
  return images;
}


async function getPerplexityHeadshotImages(personName: string, numResults = 5) {
  const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityApiKey) {
    throw new Error('Perplexity API key is not set');
  }
  const model = 'sonar-pro';
  const system = `You are an image search assistant. Given a query, find relevant professional profile images or logos. 
    Return only high-quality, business-appropriate images.
    IMPORTANT: Do not return LinkedIn images (media.licdn.com) as they require authentication.
    Prefer images from:
    - Company websites
    - Public image repositories (imgur, cloudinary)
    - News websites
    - Official press photos`;
  const user = `Find professional images for: ${personName}
    Format the response as a JSON array of objects with the following structure. Only return the JSON object, no other text or comments:
    [
      {
        "url": "direct image URL",
        "alt": "descriptive text",
        "source": "image source/website",
        "license": "license type if known"
      }
    ]
    Return only images that are:
    1. Professional and business-appropriate
    2. High resolution (at least 500x500)
    3. Have clear usage rights
    4. Direct image URLs (no redirects)
    5. NOT from LinkedIn or other authenticated sources
    Limit to 10 results.`;
 
  const data = await searchPerplexity(model, system, user);

  const images = JSON.parse(data.choices[0].message.content) as AIImage[];
  console.log("perplexity images", images);
  const allImages = await filterAccessibleImages(images);
  console.log("perplexity accessible images", allImages);
 
  // If we don't have enough accessible images, try a fallback search
  if (allImages.length < 3) {
    // Try searching with a more generic query
    const fallbackSystem = 'You are an image search assistant. Find publicly accessible professional profile images or logos.'
    const fallbackUser = `Find alternative professional images related to: ${personName}
            Focus on publicly accessible images from:
            - Official press photos
            - Public image repositories
            - News websites
            Format as JSON array with same structure as before. Only return the JSON object, no other text or comments, with null values if you don't have information.
            Exclude any previously returned URLs.
            Limit to 6 results.`
    const fallbackData = await searchPerplexity(model, fallbackSystem, fallbackUser);
    const fallbackImages = JSON.parse(fallbackData.choices[0].message.content) as AIImage[];
    console.log("perplexity fallback images", fallbackImages);
    const accessibleFallbackImages = await filterAccessibleImages(fallbackImages);
    console.log("perplexity accessible fallback images", accessibleFallbackImages);
      // Combine unique accessible images
    for (const image of accessibleFallbackImages) {
      if (!allImages.some(existing => existing.url === image.url)) {
        allImages.push(image);
      }
    }
  }
  return allImages.slice(0, numResults);
}


async function getGoogleHeadshotImages(personName: string, numResults = 5) {
  
  try {
    const items = await searchGoogle(personName, 'image', 'face', numResults);
    console.log("google data", items);
    if (!items) {
      // No items found or an error occurred
      return [];
    }
  
    // Extract relevant information about each image
    const images = items.map((item: GoogleSearchItem) => ({
      title: item.title,
      url: item.link, // Direct link to the image
      alt: item.title,
      source: item.link,
      license: item.image?.contextLink,
      thumbnailLink: item.image?.thumbnailLink,
      mime: item.mime,
    } as AIImage));
    console.log("google images", images);
    const allImages = await filterAccessibleImages(images);
    console.log("google accessible images", allImages);
   
    return allImages;
  } catch (err) {
    console.error('Error fetching headshot images:', err);
    return [];
  }
}

export { getGoogleHeadshotImages, getPerplexityHeadshotImages, filterAccessibleImages, searchImages };