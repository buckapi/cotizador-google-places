/// <reference types="@types/google.maps" />

declare namespace google.maps {
  namespace places {
    class Autocomplete extends google.maps.MVCObject {
      constructor(
        inputField: HTMLInputElement,
        opts?: google.maps.places.AutocompleteOptions
      );
      getPlace(): google.maps.places.PlaceResult;
      addListener(
        eventName: string,
        handler: Function
      ): google.maps.MapsEventListener;
    }

    interface AutocompleteOptions {
      bounds?: google.maps.LatLngBounds | google.maps.LatLngBoundsLiteral;
      componentRestrictions?: google.maps.places.ComponentRestrictions;
      fields?: string[];
      strictBounds?: boolean;
      types?: string[];
    }

    interface PlaceResult {
      address_components?: google.maps.GeocoderAddressComponent[];
      formatted_address?: string;
      geometry?: google.maps.places.PlaceGeometry;
      name?: string;
    }

    interface PlaceGeometry {
      location?: google.maps.LatLng;
      viewport?: google.maps.LatLngBounds;
    }

    interface ComponentRestrictions {
      country: string | string[];
    }
  }
}

declare var google: {
  maps: {
    places: {
      Autocomplete: typeof google.maps.places.Autocomplete;
      AutocompleteOptions: typeof google.maps.places.AutocompleteOptions;
      PlaceResult: typeof google.maps.places.PlaceResult;
      PlaceGeometry: typeof google.maps.places.PlaceGeometry;
    };
    event: {
      addListener: (instance: any, eventName: string, handler: Function) => void;
    };
    LatLng: typeof google.maps.LatLng;
    LatLngBounds: typeof google.maps.LatLngBounds;
    MVCObject: typeof google.maps.MVCObject;
  };
};
