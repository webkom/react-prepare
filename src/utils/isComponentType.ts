import { DOMElement, FunctionComponentElement, ReactText } from 'react';
import {
  ContextConsumerElement,
  ContextProviderElement,
  ElementType,
  ExoticElement,
  ForwardRefElement,
  ReactNodeType,
} from './types';

export function isElement<P>(
  element: ReactNodeType<P>,
): element is ElementType<P> {
  return !!element && typeof element === 'object';
}

export function isTextNode<P>(element: ReactNodeType<P>): element is ReactText {
  return !!element && !isElement(element);
}

// TODO: if the element.type is a symbol this is actually a React.Fragment
export function isDOMElementOrFragment<P>(
  element: ElementType<P>,
): element is DOMElement<P, Element> {
  return typeof element.type === 'string' || typeof element.type === 'symbol';
}

// export function isReactFragment<P>(
//   element: ElementType<P>,
// ): element is Iterable<ReactNode> {
//   return !!element && typeof element.type === 'symbol';
// }

function isExoticComponent<P>(
  element: ElementType<P>,
): element is ExoticElement<P> {
  return !isTextNode(element) && typeof element.type === 'object';
}

export function isContextProvider<P>(
  element: ElementType<P>,
): element is ContextProviderElement<P> {
  return (
    isExoticComponent(element) &&
    element.type.$$typeof.toString() === 'Symbol(react.provider)'
  );
}

export function isContextConsumer<P>(
  element: ElementType<P>,
): element is ContextConsumerElement<P, unknown> {
  return (
    isExoticComponent(element) &&
    element.type.$$typeof.toString() === 'Symbol(react.context)'
  );
}

export function isForwardRef<P>(
  element: ElementType<P>,
): element is ForwardRefElement<P> {
  return (
    isExoticComponent(element) &&
    element.type.$$typeof.toString() === 'Symbol(react.forward_ref)'
  );
}

export function isFunctionComponent<P>(
  element: ElementType<P>,
): element is FunctionComponentElement<P> {
  return (
    !isTextNode(element) &&
    typeof element.type === 'function' &&
    !('render' in element.type.prototype)
  );
}
