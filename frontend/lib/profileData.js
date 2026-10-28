// Kept apart from profile.js (which needs native modules) so Node can test it.

export const BIO_MAX = 150;
const PHOTO_MAX = 100000;

// A profile is written by its owner, so another user's can hold anything.
// Only an inline JPEG/PNG is used as a photo: a URL would make every viewer's device fetch it
// (telling that server their IP), and a huge string would slow every chat that shows it.
export function cleanProfile(data) {
  const photo = data && data.photo;
  const bio = data && data.bio;
  return {
    photo: typeof photo === 'string' && photo.length <= PHOTO_MAX && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+=*$/.test(photo) ? photo : null,
    bio: typeof bio === 'string' ? bio.slice(0, BIO_MAX) : '',
  };
}
