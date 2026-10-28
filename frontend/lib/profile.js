import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Every member of a room downloads each other's photo, so it is stored small: a 128px JPEG inline in GUN
const SIZE = 128;

// Lets the user pick a photo and returns it as a square data URI, or null when the picker is cancelled
export async function pickPhoto() {
  const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1] });
  if(picked.canceled) { return null; }
  const { uri, width, height } = picked.assets[0];
  let image = ImageManipulator.manipulate(uri);
  // the web picker cannot crop, so the center square is cut here
  if(width && height && width !== height) {
    const side = Math.min(width, height);
    image = image.crop({ originX: (width - side) / 2, originY: (height - side) / 2, width: side, height: side });
  }
  const rendered = await image.resize({ width: SIZE, height: SIZE }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return 'data:image/jpeg;base64,' + saved.base64;
}
