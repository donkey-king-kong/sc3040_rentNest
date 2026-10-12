import { act, create } from 'react-test-renderer';

const mounted = [];

export async function render(element) {
  let renderer;
  await act(async () => { renderer = create(element); });
  mounted.push(renderer);
  return renderer;
}

afterEach(async () => {
  await act(async () => {
    mounted.splice(0).forEach(renderer => renderer.unmount());
  });
});

export function text(node) {
  if (node == null) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  return (node.children || []).map(text).join('');
}

export function buttons(renderer) {
  return renderer.root.findAllByType('TouchableOpacity');
}

export function button(renderer, label) {
  const found = buttons(renderer).find(node =>
    text(node) === label || node.props.accessibilityLabel === label);
  if (!found) throw new Error(`Missing button: ${label}; found: ${buttons(renderer).map(text)}`);
  return found;
}

export async function press(renderer, label) {
  const target = button(renderer, label);
  if (target.props.disabled) throw new Error(`Cannot press disabled button: ${label}`);
  await act(async () => { await target.props.onPress(); });
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

export const httpError = status => ({ response: { status } });
