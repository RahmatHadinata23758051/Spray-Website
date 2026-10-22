interface SpraybotNavigationHandler {
  (targetPath: string): Promise<boolean>;
}

interface Window {
  __spraybot_on_nav_attempt?: SpraybotNavigationHandler;
  __spraybot_navigation_blocker?: boolean;
}