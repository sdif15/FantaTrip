import { GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { auth } from "../config/firebaseConfig";

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function loginWithApple() {
  return signInWithPopup(auth, appleProvider);
}

export async function logout() {
  return signOut(auth);
}
