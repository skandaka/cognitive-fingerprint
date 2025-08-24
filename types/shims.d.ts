// Temporary shim types because dependencies not yet installed.
declare module 'react' {
  export type ReactNode = any;
  export interface FC<P = any> { (props: P & { children?: ReactNode }): any; }
  // Expanded useState typing to support functional updates
  export function useState<T=any>(init?: T): [T, (v: T | ((prev: T) => T)) => void];
  export function useEffect(cb:()=>any, deps?: any[]): void;
  export function useRef<T=any>(v?:T): { current: T };
  export function useContext<T=any>(ctx:any): T;
  export function createContext<T=any>(v:T): any;
  const React: any;
  export default React;
}
declare module 'react-dom' { const x: any; export default x; }
declare namespace JSX { interface IntrinsicElements { [k: string]: any; } }
declare module '@react-three/fiber' { export const Canvas: any; }
declare module '@react-three/drei' { export const OrbitControls: any; }
declare module 'meyda' { export const createMeydaAnalyzer: any; }
declare module 'jspdf' { const jsPDF: any; export default jsPDF; }
declare module 'next/server' { export const NextResponse: any; }
