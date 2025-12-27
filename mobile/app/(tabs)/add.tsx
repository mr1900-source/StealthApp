/**
 * Add Screen Placeholder
 * 
 * This redirects to the new save modal.
 */

import { Redirect } from 'expo-router';

export default function AddScreen() {
  return <Redirect href="/save/new" />;
}