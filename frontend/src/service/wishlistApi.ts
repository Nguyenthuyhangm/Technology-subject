import axios from 'axios';

const API_URL = "http://localhost:8080/api/wishlist";

export const addToWishlist = async (userId: string, productId: string) => {
    const response = await axios.post(`${API_URL}/${userId}/add/${productId}`);
    return response.data;
};

export const getWishlist = async (userId: string) => {
    const response = await axios.get(`${API_URL}/${userId}`);
    return response.data;
};