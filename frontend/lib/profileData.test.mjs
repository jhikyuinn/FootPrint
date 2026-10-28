import assert from 'node:assert/strict';
import { cleanProfile } from './profileData.js';

const jpeg = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
assert.deepEqual(cleanProfile({ photo: jpeg, bio: 'hi' }), { photo: jpeg, bio: 'hi' });
assert.deepEqual(cleanProfile(undefined), { photo: null, bio: '' });
// anything but inline image data is dropped
for(const photo of ['https://example.com/a.jpg', 'data:text/html;base64,PGgxPg==', 'data:image/svg+xml;base64,PHN2Zz4=', jpeg + '"><x', 42]) {
  assert.equal(cleanProfile({ photo }).photo, null, String(photo));
}
assert.equal(cleanProfile({ photo: 'data:image/png;base64,' + 'A'.repeat(100000) }).photo, null);
assert.equal(cleanProfile({ bio: 'x'.repeat(500) }).bio.length, 150);
assert.equal(cleanProfile({ bio: { a: 1 } }).bio, '');
console.log('ok');
