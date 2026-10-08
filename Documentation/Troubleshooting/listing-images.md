# Listing Image Rendering Troubleshoot

This note documents the listing image rendering bug found in the React Native app and the fix that is now in place.

## Problem Summary

Listing cards, listing detail screens, inbox listing cards, and rental info screens showed blank image areas or `Image unavailable` even when the `listingpicture` URL opened successfully in a browser.

User profile pictures still rendered correctly, so the issue was isolated to listing image handling.

## Symptoms

- Listing text rendered normally, but listing images were blank.
- The same issue appeared on Home, Listing Detail, Inbox, and Rental Info screens.
- Directly opening the listing image URL in a browser worked.
- Android logs showed native image decoder memory failures.

Example failure log:

```text
LOG  [ListingImage] failed {"listingId": 39, "listingName": "Orchard Road Condo", "nativeError": "Pool hard cap violation? Hard cap = 150994944 Used size = 150988280 Free size = 0 Request size = 614400", "normalizedUrl": "`https://picsum.photos/seed/listing39/600/400`", "optimizedUrl": "`https://picsum.photos/seed/listing39/480/320`", "originalUrl": "`https://picsum.photos/seed/listing39/600/400`", "renderedUrl": "`https://picsum.photos/seed/listing39/480/320`", "screen": "HomeScreen", "usingFallback": false}
```

Example fallback failure log:

```text
LOG  [ListingImage] failed {"listingId": 38, "listingName": "Toa Payoh HDB 4-Room", "nativeError": "Pool hard cap violation? Hard cap = 150994944 Used size = 150988280 Free size = 0 Request size = 811200", "normalizedUrl": "`https://onecms-res.cloudinary.com/image/upload/s--9axR4bQB--/f_auto,q_auto/c_fill,g_auto,h_676,w_1200/singapore-home-renovation-contractors-hdb.jpg?itok=tx9GFgAG`", "optimizedUrl": "`https://onecms-res.cloudinary.com/image/upload/s--9axR4bQB--/f_auto,q_auto/c_fill,g_auto,h_320,w_480/singapore-home-renovation-contractors-hdb.jpg?itok=tx9GFgAG`", "originalUrl": "`https://onecms-res.cloudinary.com/image/upload/s--9axR4bQB--/f_auto,q_auto/c_fill,g_auto,h_676,w_1200/singapore-home-renovation-contractors-hdb.jpg?itok=tx9GFgAG`", "renderedUrl": "`https://onecms-res.cloudinary.com/image/upload/s--9axR4bQB--/f_auto,q_auto/c_fill,g_auto,h_338,w_600/singapore-home-renovation-contractors-hdb.jpg?itok=tx9GFgAG`", "screen": "HomeScreen", "usingFallback": true}
```

## Root Causes

- Some API responses returned listing image URL strings with wrapper characters around the URL.
- React Native must receive a clean direct image URI, such as `https://picsum.photos/seed/listing39/600/400`.
- Android image decoding hit a native memory pool limit while multiple remote listing images were loading.
- Retrying another remote fallback image after a failed image load added more memory pressure.
- `ListingsService.toListingsDTO()` did not originally map `listingpicture`, so DTO-based listing endpoints could lose listing images.

## Final Fix

The frontend fix is centralized in `frontend/RentNest/components/ListingImage.jsx`.

`ListingImage` now:

- Extracts a clean `http://` or `https://` URL before passing it to React Native `<Image>`.
- Removes common quote and backtick-like wrapper characters.
- Optimizes known image hosts to request smaller image dimensions.
- Logs clear image debug data with `sanitizerVersion`, `originalUrl`, `normalizedUrl`, `optimizedUrl`, `renderedUrl`, and `nativeError`.
- Shows an `Image unavailable` placeholder after terminal image load failure.
- Avoids retrying a second remote fallback image after failure to prevent extra Android decode pressure.

`frontend/RentNest/app/HomeScreen.jsx` now:

- Requests smaller listing card images.
- Renders fewer image rows at once with FlatList batching settings.

`RentNest/src/main/java/RentNest/service/ListingsService.java` now maps:

```java
listingsDTO.setListingpicture(listings.getListingpicture());
```

## Debug Log Guide

Successful preparation should look like this shape:

```text
LOG  [ListingImage] prepared {"sanitizerVersion": "extract-url-v2", "screen": "HomeScreen", "listingId": 39, "listingName": "Orchard Road Condo", "originalUrl": "`https://picsum.photos/seed/listing39/600/400`", "normalizedUrl": "https://picsum.photos/seed/listing39/600/400", "optimizedUrl": "https://picsum.photos/seed/listing39/240/160", "renderedUrl": "https://picsum.photos/seed/listing39/240/160", "usingFallback": false, "originalBoundaryCharCodes": [96, 96], "renderedBoundaryCharCodes": [104, 48]}
```

Key fields:

- `originalUrl`: Raw value received by the screen.
- `normalizedUrl`: Clean URL extracted by `ListingImage`.
- `optimizedUrl`: Final URL after resizing known image hosts.
- `renderedUrl`: URL passed to React Native `<Image>`.
- `nativeError`: Native image loading error when rendering fails.
- `originalBoundaryCharCodes`: First and last character codes of the raw URL.
- `renderedBoundaryCharCodes`: First and last character codes of the rendered URL.

If `renderedUrl` still contains wrapper characters, inspect `originalBoundaryCharCodes` to identify the unexpected character.

If `nativeError` contains `Pool hard cap violation`, reduce image dimensions or reduce the number of images rendered at once.

## Listing Image URL Requirements

Listing image values should be direct image URLs:

```text
https://example.com/path/to/image.jpg
```

Avoid storing values with Markdown formatting or wrapping characters:

```text
`https://example.com/path/to/image.jpg`
```

If Supabase table display looks clean but API logs show wrappers, verify the actual API response used by the mobile app.

## Future Checklist

- Keep listing image URLs public and directly loadable.
- Keep image dimensions small for list thumbnails.
- Use `ListingImage` for listing images instead of raw React Native `<Image>`.
- Do not reintroduce remote fallback retries after image load failure on Android.
- Keep `listingpicture` mapped in `ListingsDTO`.
- Keep debug logs until listing image behavior is stable across Android, iOS, and web.
