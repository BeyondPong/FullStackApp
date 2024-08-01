import WebSocketManager from "../state/WebSocketManager.js";

export default function webSocketFocus() {
    WebSocketManager.isGameSocketFocus = true;
}

export default function webSocketBlur() {
    WebSocketManager.isGameSocketFocus = false;
}