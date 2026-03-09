import { Redirect } from 'expo-router';

export default function CheckpointTab() {
  // This tab immediately redirects to the checkpoint modal flow
  return <Redirect href="/checkpoint/enter-trade" />;
}
