declare module 'react-shallow-renderer' {
  import { Context } from 'react';
  export default class ShallowRenderer {
    render(element: React.ReactElement, context?: Context<unknown>): void;
    getRenderOutput(): React.ReactElement | null;
  }
}
