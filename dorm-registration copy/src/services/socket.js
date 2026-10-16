import io from 'socket.io-client';
import { API_BASE_URL } from './api';

// ใช้ Socket.io connection เดียวร่วมกันทั้งแอป
const socket = io(API_BASE_URL);

export default socket;
