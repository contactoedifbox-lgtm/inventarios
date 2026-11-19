import { expect, test } from '@playwright/test';

test('la pantalla de acceso muestra el formulario del personal', async ({ page }) => {
  await page.goto('/#/login');

  await expect(page.getByRole('heading', { name: 'LankaPets' })).toBeVisible();
  await expect(page.getByLabel('Correo')).toBeVisible();
  await expect(page.getByLabel('Contrasena')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
});

test('una ruta interna sin sesion redirige al login', async ({ page }) => {
  await page.goto('/#/inventario');
  await expect(page).toHaveURL(/#\/login/);
});
