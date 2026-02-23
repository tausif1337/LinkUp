import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { cloudinaryConfig } from '../config/cloudinary';

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
                base64: true,
            })
            : await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
                base64: true,
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

export const uploadToCloudinary = async (uri: string) => {
    const data = new FormData();

    // For React Native, we need to handle the file object correctly
    const filename = uri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : `image`;

    // @ts-ignore
    data.append('file', {
        uri: uri,
        name: filename || 'upload.jpg',
        type: type,
    });

    // Using unsigned upload. 'ml_default' is the standard default preset.
    // If this fails, the user might need to create an unsigned preset in Cloudinary settings.
    data.append('upload_preset', 'ml_default');
    data.append('cloud_name', cloudinaryConfig.cloudName);

    try {
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
            {
                method: 'POST',
                body: data,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        const result = await response.json();
        if (result.secure_url) {
            return result.secure_url;
        } else {
            console.error('Cloudinary Error:', result);
            throw new Error(result.error?.message || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload to Cloudinary failed:', error);
        throw error;
    }
};
