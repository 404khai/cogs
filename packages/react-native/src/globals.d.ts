// Globals the React Native runtime provides (atob/btoa since 0.74) that its types leave out.
declare const performance: { now(): number };
declare function atob(data: string): string;
declare function btoa(data: string): string;
