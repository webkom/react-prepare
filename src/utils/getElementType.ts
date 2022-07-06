import { ExoticComponent, ReactElement, ReactNode } from 'react';

export enum ELEMENT_TYPE {
  NOTHING = 0,
  TEXT_NODE = 1,
  DOM_ELEMENT = 2,
  FRAGMENT = 3,
  CONTEXT_PROVIDER = 4,
  CONTEXT_CONSUMER = 5,
  FORWARD_REF = 6,
  MEMO = 7,
  FUNCTION_COMPONENT = 8,
  CLASS_COMPONENT = 9,
}

function isTextNode(element: ReactNode): element is string | number {
  return typeof element === 'number' || typeof element === 'string';
}

function isReactElement(element: ReactNode): element is ReactElement {
  return !!element && typeof element === 'object';
}

export default function getElementType(element: ReactNode) {
  if (isTextNode(element)) {
    return ELEMENT_TYPE.TEXT_NODE;
  } else if (!isReactElement(element)) {
    return ELEMENT_TYPE.NOTHING;
  } else if (typeof element.type === 'string') {
    return ELEMENT_TYPE.DOM_ELEMENT;
  } else if (typeof element.type === 'symbol') {
    return ELEMENT_TYPE.FRAGMENT;
  } else if (typeof element.type === 'object') {
    // Exotic components
    const type: ExoticComponent = element.type;
    if (type.$$typeof.toString() === 'Symbol(react.provider)') {
      return ELEMENT_TYPE.CONTEXT_PROVIDER;
    } else if (type.$$typeof.toString() === 'Symbol(react.context)') {
      return ELEMENT_TYPE.CONTEXT_CONSUMER;
    } else if (type.$$typeof.toString() === 'Symbol(react.forward_ref)') {
      return ELEMENT_TYPE.FORWARD_REF;
    } else if (type.$$typeof.toString() === 'Symbol(react.memo)') {
      return ELEMENT_TYPE.MEMO;
    }
  } else if (typeof element.type === 'function') {
    if (!element.type.prototype || !('render' in element.type.prototype)) {
      return ELEMENT_TYPE.FUNCTION_COMPONENT;
    } else if (
      typeof element.type.prototype === 'object' &&
      typeof element.type.prototype.render === 'function'
    ) {
      return ELEMENT_TYPE.CLASS_COMPONENT;
    }
  }
  throw Error('Unrecognized element type: \n' + element);
}
