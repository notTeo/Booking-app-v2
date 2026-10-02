import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ShopContextProvider, useShop } from './ShopContext';

function Probe() {
  const { shop, isLoading } = useShop();
  return <span>{`loading=${isLoading};shop=${shop ? 'yes' : 'no'}`}</span>;
}

describe('ShopContextProvider', () => {
  it('starts in the loading state so the first frame never reads as "no shop"', () => {
    const html = renderToString(
      <ShopContextProvider>
        <Probe />
      </ShopContextProvider>,
    );
    expect(html).toContain('loading=true;shop=no');
  });
});
