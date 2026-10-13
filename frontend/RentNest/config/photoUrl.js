export const PHOTO_URL_MAX_LENGTH = 255;
export const PHOTO_URL_ERROR = 'Enter a full http:// or https:// image URL (up to 255 characters), without spaces or login details.';

// Match the backend's whitespace rules without rewriting URL encoding or case.
const whitespace = '[\\u0009-\\u000D\\u001C-\\u0020\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000]';
const boundaryWhitespace = new RegExp(`^${whitespace}+|${whitespace}+$`, 'g');
const internalWhitespace = new RegExp(whitespace);

export const trimPhotoUrl = (value) => (value ?? '').replace(boundaryWhitespace, '');

export const getPhotoUrlError = (value) => {
  const url = trimPhotoUrl(value);
  if (!url) return '';
  if (url.length > PHOTO_URL_MAX_LENGTH || internalWhitespace.test(url)
      || /[\u0000-\u001F\u007F-\u009F<>"{}|\\^`]/.test(url)
      || /%(?![a-f\d]{2})/i.test(url)) {
    return PHOTO_URL_ERROR;
  }

  const parts = /^https?:\/\/([^/?#]+)([^?#]*)(?:\?[^#]*)?(?:#[^#]*)?$/i.exec(url);
  if (!parts || /[\[\]]/.test(parts[2])) return PHOTO_URL_ERROR;
  const authority = parts[1];
  if (authority.includes('@')) return PHOTO_URL_ERROR;
  const address = /^(\[[^\]]+\]|[^:]+)(?::(\d*))?$/.exec(authority);
  if (!address || (address[2] && Number(address[2]) > 2147483647)) return PHOTO_URL_ERROR;
  const host = address[1];

  if (host.startsWith('[')) {
    try {
      // Parse only the host: browser URL parsing would otherwise rewrite the input.
      new URL(`http://${host}/`);
    } catch {
      return PHOTO_URL_ERROR;
    }
  } else {
    const labels = host.replace(/\.$/, '').split('.');
    if (labels.some((label) => !/^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label))) {
      return PHOTO_URL_ERROR;
    }
    if (/^[\d.]+$/.test(host) && host.includes('.')) {
      if (labels.length !== 4 || host.endsWith('.') || labels.some((label) => Number(label) > 255)) {
        return PHOTO_URL_ERROR;
      }
    } else if (labels.length > 1 && !/^[a-z]/i.test(labels[labels.length - 1])) {
      return PHOTO_URL_ERROR;
    }
  }
  return '';
};
