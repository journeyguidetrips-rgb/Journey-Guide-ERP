export declare const createItinerary: (userId: number, vendorName: string, clientName: string, content: string) => Promise<any>;
export declare const getItinerary: (id: string) => Promise<any>;
export declare const getUserItineraries: (userId: number) => Promise<any[]>;
export declare const updateItinerary: (id: string, content: string, htmlContent: string) => Promise<any>;
export declare const publishItinerary: (id: string) => Promise<any>;
export declare const deleteItinerary: (id: string) => Promise<boolean>;
//# sourceMappingURL=itineraryService.d.ts.map