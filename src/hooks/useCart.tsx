import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

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
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data } = await api.get(
        `http://localhost:3333/products/${productId}`
      );

      const { data: productStock } = await api.get(
        `http://localhost:3333/stock/${productId}`
      );

      const productAmountInCart = cart.filter(
        (product) => product.id === productId
      )[0];

      if (productAmountInCart !== undefined) {
        if (productAmountInCart.amount + 1 > productStock.amount) {
          throw new Error("Quantidade solicitada fora de estoque");
        }

        setCart((prevState) =>
          prevState.map((product) => {
            if (product.id === productId) {
              return { ...product, amount: product.amount + 1 };
            }

            return product;
          })
        );

        return localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(
            cart.map((product) => {
              if (product.id === productId) {
                return { ...product, amount: product.amount + 1 };
              }

              return product;
            })
          )
        );
      } else {
        if (productStock !== undefined) {
          setCart((prevState) => [...prevState, { ...data, amount: 1 }]);
          return localStorage.setItem(
            "@RocketShoes:cart",
            JSON.stringify([...cart, { ...data, amount: 1 }])
          );
        }
      }
    } catch (err: any) {
      switch (err.message) {
        case "Request failed with status code 404":
          toast.error("Erro na adição do produto");
          break;
        case "Quantidade solicitada fora de estoque":
          toast.error(err.message);
          break;
        default:
          toast.error("Erro na adição do produto");
      }
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productExist = cart.filter((product) => product.id === productId);

      if (productExist.length !== 0) {
        setCart((prevState) =>
          prevState.filter((product) => product.id !== productId)
        );

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(cart.filter((product) => product.id !== productId))
        );
      } else {
        throw new Error("Erro na remoção do produto");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const { data: productStock } = await api.get(
        `http://localhost:3333/stock/${productId}`
      );

      if (amount <= 0) {
        return;
      }

      if (amount > productStock.amount) {
        throw new Error("Quantidade solicitada fora de estoque");
      } else {
        setCart((prevState) =>
          prevState.map((product) => {
            if (product.id === productId) {
              return { ...product, amount: amount };
            }

            return product;
          })
        );

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(
            cart.map((product) => {
              if (product.id === productId) {
                return { ...product, amount: amount };
              }

              return product;
            })
          )
        );
      }
    } catch (err: any) {
      switch (err.message) {
        case "Request failed with status code 404":
          toast.error("Erro na alteração de quantidade do produto");
          break;
        case "Quantidade solicitada fora de estoque":
          toast.error(err.message);
          break;
        default:
          toast.error("Erro na alteração de quantidade do produto");
      }
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
