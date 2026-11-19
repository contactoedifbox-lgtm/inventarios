import { expect, test } from '@playwright/test';

test('la pagina publica de reservas carga sin login', async ({ page }) => {
  await page.goto('/#/reservar');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText('Reserva tu hora')).toBeVisible();
  await expect(page.getByLabel('Profesional')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Solicitar reserva' })).toBeVisible();
});

test('valida el RUT en el formulario publico', async ({ page }) => {
  await page.goto('/#/reservar');

  const rut = page.getByPlaceholder('RUT 12.345.678-5');
  await rut.fill('12345678');
  await rut.blur();

  await expect(page.getByText('RUT invalido')).toBeVisible();
});
