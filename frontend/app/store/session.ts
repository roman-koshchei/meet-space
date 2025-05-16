export function saveUsername(username: string) {
  sessionStorage.setItem("username", username);
}

export function loadUsername() {
  return sessionStorage.getItem("username");
}
