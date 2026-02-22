import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';

export const pickImage = async (useCamera: boolean = false) => {
    try {
        const permissionResult = useCamera
            ? await ImagePicker.requestCameraPermissionsAsync()
            : await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (permissionResult.granted === false) {
            Alert.alert('Permission Required', 'You need to allow access to select a photo.');
            return null;
        }

        const result = useCamera
            ? await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
                base64: true, // Request base64
            })
            : await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
                base64: true, // Request base64
            });

        if (!result.canceled && result.assets && result.assets[0]) {
            return result.assets[0];
        }
        return null;
    } catch (error) {
        console.error('Error picking image:', error);
        Alert.alert('Error', 'An error occurred while picking the image.');
        return null;
    }
};
