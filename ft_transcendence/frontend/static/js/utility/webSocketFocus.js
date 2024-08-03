import WebSocketManager from "../state/WebSocketManager.js";

export function webSocketFocus() {
  WebSocketManager.isGameSocketFocus = true;
}

export function webSocketBlur() {
  WebSocketManager.isGameSocketFocus = false;
}
