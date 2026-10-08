# Profile Image Handling Troubleshoot

This note documents the shared profile/avatar image handling used across the React Native app.

## Purpose

Profile images are used in profile, chat, review, rental, and admin screens. These images should render consistently even when a stored URL is missing, malformed, or fails to load.

Use `frontend/RentNest/components/ProfileImage.jsx` for profile/avatar images instead of raw React Native `<Image>` when rendering a remote user image URL.

## Behavior

`ProfileImage`:

- Extracts a clean `http://` or `https://` URL before rendering.
- Removes common quote and backtick-like wrapper characters.
- Does not resize, downscale, or rewrite profile image dimensions.
- Logs permanent debug events for profile image lifecycle checks.
- Shows initials only when the URL is missing, malformed, or fails to load.
- Shows `?` if no user name is available for initials.

## Debug Logs

Expected log events:

```text
[ProfileImage] prepared
[ProfileImage] loaded
[ProfileImage] failed
```

Useful fields:

- `sanitizerVersion`: Version marker for the profile URL sanitizer.
- `screen`: Screen where the image is rendered.
- `userId`: User represented by the image, when available.
- `name`: User name used for initials fallback.
- `role`: Context such as `profile`, `owner`, `tenant`, `reviewer`, or `chat-partner`.
- `originalUrl`: Raw URL value received by the screen.
- `normalizedUrl`: Clean URL extracted before rendering.
- `renderedUrl`: URL passed to React Native `<Image>`.
- `nativeError`: Native image loading error when rendering fails.
- `originalBoundaryCharCodes`: First and last character codes of the raw URL.
- `renderedBoundaryCharCodes`: First and last character codes of the rendered URL.

## Fallback Rule

- Valid image URL loads successfully: show the image.
- Missing URL: show initials.
- Malformed URL: show initials.
- Failed image load: show initials.
- Missing name: show `?`.

## Current Usage

`ProfileImage` is used for user avatars/profile images in:

- Profile and edit profile screens.
- Chat list and chat detail avatars.
- Listing detail owner and reviewer avatars.
- Rental owner and tenant avatars.
- Tenant overview avatar.
- User review avatars.
- Admin flagged user and review/listing owner avatars.

## Future Checklist

- Use `ProfileImage` for remote user/profile/avatar URLs.
- Do not add profile-image resizing unless product requirements change.
- Keep `[ProfileImage]` logs permanent for debugging.
- Keep `photoURL` as the canonical backend user profile image field.
- Prefer initials fallback over default remote avatar images.
