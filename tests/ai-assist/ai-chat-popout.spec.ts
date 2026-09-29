import { test, expect } from '../../playwright';
import { closeAllCollections, createCollection } from '../utils/page';
import { buildCommonLocators } from '../utils/page/locators';

test.describe('AI chat popout', () => {
  test.afterEach(async ({ pageWithUserData }) => {
    await closeAllCollections(pageWithUserData);
  });

  test('pops the chat out into its own window and docks it back', async ({ pageWithUserData: page, createTmpDir }) => {
    const locators = buildCommonLocators(page);
    const collectionName = 'ai-chat-popout';

    await test.step('Arrange: open the docked AI chat', async () => {
      await createCollection(page, collectionName, await createTmpDir(collectionName));
      await locators.aiChat.headerToggle().click();
      await expect(locators.aiChat.popoutToggle()).toBeVisible();
    });

    const popout = await test.step('Pop out: the chat renders in a new window', async () => {
      await locators.aiChat.popoutToggle().click();

      // In dev, StrictMode's double effect opens and immediately closes a first
      // window before the one that stays, so wait for exactly one live popout.
      const openPopouts = () => page.context().pages().filter((p) => p !== page && !p.isClosed());
      await expect.poll(() => openPopouts().length).toBe(1);
      const [popoutPage] = openPopouts();

      await expect(buildCommonLocators(popoutPage).aiChat.popoutToggle()).toHaveAttribute('title', 'Dock to sidebar');
      await expect(locators.aiChat.popoutToggle()).toHaveCount(0);
      return popoutPage;
    });

    await test.step('Dock: the window closes and the chat returns to the sidebar', async () => {
      const closePromise = popout.waitForEvent('close');
      // Docking closes this window synchronously inside the click handler, which
      // Playwright reports as a failed click, so fire it after the call returns.
      await buildCommonLocators(popout).aiChat.popoutToggle().evaluate((button: HTMLElement) => {
        setTimeout(() => button.click(), 0);
      });
      await closePromise;

      await expect(locators.aiChat.popoutToggle()).toHaveAttribute('title', 'Open in new window');
    });
  });
});
