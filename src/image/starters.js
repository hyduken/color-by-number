import { loadImage } from './processor.js';

export const starterPictures = [
  { id: 'fox', title: 'Fox', url: '/starters/fox.webp' },
  { id: 'turtle', title: 'Sea turtle', url: '/starters/turtle.webp' },
  { id: 'rocket', title: 'Rocket', url: '/starters/rocket.webp' },
  { id: 'garden', title: 'Flowers', url: '/starters/garden.webp' },
];

export async function loadStarter(id) {
  const picture = starterPictures.find((item) => item.id === id);
  if (!picture) throw new Error('Choose one of our starter pictures.');
  const response = await fetch(picture.url);
  if (!response.ok) throw new Error('Could not open that starter picture. Please try again.');
  const blob = await response.blob();
  const loaded = await loadImage(new File([blob], `${picture.id}.webp`, { type: 'image/webp' }));
  loaded.title = picture.title;
  return loaded;
}
