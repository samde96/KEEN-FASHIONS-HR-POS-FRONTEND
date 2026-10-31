import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProductPhotoInput from '../components/ProductPhotoInput';
import { prepareProductPhoto } from '../services/productPhoto';

vi.mock('../services/productPhoto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/productPhoto')>()),
  prepareProductPhoto: vi.fn(),
}));
const photo = 'data:image/webp;base64,selected-photo';
const file = new File(['sample-photo'], 'shirt.png', { type: 'image/png' });
const busy = vi.fn();
function PhotoForm({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <ProductPhotoInput value={value} onChange={setValue} onBusyChange={busy} disabled={false} />
  );
}
beforeEach(() => {
  vi.mocked(prepareProductPhoto).mockReset();
  busy.mockClear();
});
afterEach(cleanup);

it('selects a device photo, shows a preview, and can remove it', async () => {
  vi.mocked(prepareProductPhoto).mockResolvedValue(photo);
  render(<PhotoForm />);
  await userEvent.upload(screen.getByLabelText('Product photo'), file);
  expect(await screen.findByAltText('Product photo preview')).toHaveAttribute('src', photo);
  expect(busy).toHaveBeenLastCalledWith(false);
  await userEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
  expect(screen.queryByAltText('Product photo preview')).not.toBeInTheDocument();
  expect((screen.getByLabelText('Product photo') as HTMLInputElement).files).toHaveLength(0);
});

it('keeps the current photo when a replacement cannot be prepared', async () => {
  vi.mocked(prepareProductPhoto).mockRejectedValue(new Error('This photo could not be opened.'));
  render(<PhotoForm initial={photo} />);
  await userEvent.upload(screen.getByLabelText('Product photo'), file);
  expect(await screen.findByRole('alert')).toHaveTextContent('This photo could not be opened.');
  expect(screen.getByAltText('Product photo preview')).toHaveAttribute('src', photo);
  expect(busy).toHaveBeenLastCalledWith(false);
});

it('keeps the newest selection when an older photo finishes later', async () => {
  let first!: (photo: string) => void;
  let second!: (photo: string) => void;
  vi.mocked(prepareProductPhoto)
    .mockReturnValueOnce(
      new Promise((resolve) => {
        first = resolve;
      }),
    )
    .mockReturnValueOnce(
      new Promise((resolve) => {
        second = resolve;
      }),
    );
  render(<PhotoForm />);
  await userEvent.upload(screen.getByLabelText('Product photo'), file);
  await userEvent.upload(
    screen.getByLabelText('Product photo'),
    new File(['next-photo'], 'next.png', { type: 'image/png' }),
  );
  await act(async () => {
    second(photo);
  });
  await act(async () => {
    first('data:image/webp;base64,older-photo');
  });
  expect(screen.getByAltText('Product photo preview')).toHaveAttribute('src', photo);
});

it('does not put a cancelled photo back after removing it', async () => {
  let finish!: (photo: string) => void;
  vi.mocked(prepareProductPhoto).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  render(<PhotoForm />);
  await userEvent.upload(screen.getByLabelText('Product photo'), file);
  await userEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
  await act(async () => {
    finish(photo);
  });
  expect(screen.queryByAltText('Product photo preview')).not.toBeInTheDocument();
});

it('ignores a photo finishing after its product form has closed', async () => {
  let finish!: (photo: string) => void;
  const change = vi.fn();
  vi.mocked(prepareProductPhoto).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    }),
  );
  const view = render(
    <ProductPhotoInput value="" onChange={change} onBusyChange={busy} disabled={false} />,
  );
  await userEvent.upload(screen.getByLabelText('Product photo'), file);
  view.unmount();
  await act(async () => {
    finish(photo);
  });
  expect(change).not.toHaveBeenCalled();
});
