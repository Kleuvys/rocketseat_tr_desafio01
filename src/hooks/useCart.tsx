import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const [itemAlreadyInCart] = updatedCart.filter(item => item.id === productId);

      if (itemAlreadyInCart) {
        const { data: productStock } = await api.get<Stock>(`stock/${productId}`);

        if (itemAlreadyInCart.amount < productStock.amount) {
          updatedCart.map(product => {
            if (product.id === itemAlreadyInCart.id) {
              product.amount++;
            }
          });
        } else {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        console.log(`updatedCart`, updatedCart);
        setCart(updatedCart);
      } else {
        const { data: newProduct } = await api.get<Product>(`products/${productId}`);
        newProduct.amount = 1;
        updatedCart.push(newProduct);
        setCart(updatedCart);
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productIndex = updatedCart.findIndex((product) => product.id === productId);

      if (productIndex < 0) {
        throw Error();
      }

      updatedCart.splice(productIndex, 1);
      console.log(updatedCart);

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const { data: { amount: productAmountInStock } } = await api.get<Stock>(`stock/${productId}`);

      if (amount > productAmountInStock) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const updatedCart = [...cart];
      updatedCart.map((product) => {
        if (product.id === productId) {
          product.amount = amount;
        }
      });

      setCart(updatedCart);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
