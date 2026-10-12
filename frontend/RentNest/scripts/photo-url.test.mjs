import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { transformSync } from '@babel/core';
import React, { act } from 'react';
import { create } from 'react-test-renderer';

// Run from frontend/RentNest: node --test scripts/photo-url.test.mjs
// Native rendering and image downloads are deliberately outside this harness.
const require = createRequire(import.meta.url);
const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const compiled = new Map();
const OLD_PHOTO = 'https://example.com/old.jpg';
const FULL_PHOTO = "HTTPS://EXAMPLE.COM/Zo\u00eb's/photo%20large?size=1&token=a+b%2Fc%25#preview";
const initialUser = {
  userID: 42,
  name: 'Ada Lovelace',
  email: 'ada+qa@example.com',
  contact: '91234567',
  photoURL: OLD_PHOTO,
};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function deferred() {
  let resolvePromise;
  let reject;
  const promise = new Promise((resolve, rejectPromise) => {
    resolvePromise = resolve;
    reject = rejectPromise;
  });
  return { promise, resolve: resolvePromise, reject };
}

function harness(t, user = {}) {
  const h = {
    user: { ...initialUser, ...user },
    focusCalls: [],
    logs: [],
    errors: [],
    storage: new Map([['token', 'qa-token']]),
  };
  t.mock.method(console, 'log', (...args) => h.logs.push(args));
  const originalError = console.error;
  t.mock.method(console, 'error', (...args) => {
    // React 19 deprecates this installed renderer; keep all other warnings visible.
    if (String(args[0]).startsWith('react-test-renderer is deprecated')) return;
    h.errors.push(args);
    originalError(...args);
  });
  h.router = Object.fromEntries(
    ['push', 'replace', 'back'].map(method => [method, t.mock.fn()]),
  );
  h.asyncStorage = {
    getItem: t.mock.fn(async key => h.storage.get(key) ?? null),
    setItem: t.mock.fn(async (key, value) => { h.storage.set(key, value); }),
    multiRemove: t.mock.fn(async keys => keys.forEach(key => h.storage.delete(key))),
  };
  h.axios = {
    defaults: { headers: { common: {} } },
    isCancel: error => error?.code === 'ERR_CANCELED',
    get: t.mock.fn(async () => ({ data: { ...h.user } })),
    post: t.mock.fn(async () => ({ data: { ...h.user } })),
    put: t.mock.fn(async (_url, _body, { params }) => {
      h.user = { ...h.user, ...params };
      if (params.photoURL === '') h.user.photoURL = null;
      return { data: { ...h.user } };
    }),
  };
  const Focus = React.createContext(null);
  const native = Object.fromEntries([
    'View', 'Text', 'TextInput', 'KeyboardAvoidingView', 'ScrollView',
    'TouchableOpacity', 'Pressable', 'Image', 'ActivityIndicator', 'Modal',
  ].map(name => [name, name]));
  native.Platform = { OS: 'ios', select: options => options.ios ?? options.default };
  native.StyleSheet = { create: styles => styles };
  native.Alert = { alert: t.mock.fn() };
  h.alert = native.Alert.alert;
  const mocks = {
    react: React,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'react/jsx-dev-runtime': require('react/jsx-dev-runtime'),
    'react-native': native,
    'expo-constants': {},
    'expo/virtual/env': { env: { EXPO_PUBLIC_API_BASE_URL: 'https://api.qa.invalid' } },
    'expo-router': {
      useRouter: () => h.router,
      useFocusEffect(callback) {
        const focus = React.useContext(Focus);
        React.useEffect(() => {
          if (focus.active) return callback();
          return undefined;
        }, [callback, focus.active, focus.generation]);
      },
    },
    axios: h.axios,
    '@react-native-async-storage/async-storage': h.asyncStorage,
    'jwt-decode': { jwtDecode: () => ({ sub: initialUser.email }) },
    '@expo/vector-icons': { FontAwesome: 'FontAwesome' },
  };
  const modules = new Map();
  const sourceFiles = new Set([
    'app/SignUpScreen.jsx', 'app/EditProfileScreen.jsx', 'app/ProfileScreen.jsx',
    'components/ProfileImage.jsx', 'config/photoUrl.js', 'config/api.js',
  ].map(path => resolve(appRoot, path)));

  function load(filename) {
    if (modules.has(filename)) return modules.get(filename).exports;
    assert.ok(sourceFiles.has(filename), `Unexpected source import: ${filename}`);
    if (!compiled.has(filename)) {
      compiled.set(filename, transformSync(readFileSync(filename, 'utf8'), {
        filename,
        babelrc: false,
        configFile: false,
        presets: [[require.resolve('babel-preset-expo'), { jsxRuntime: 'automatic' }]],
        plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
      }).code);
    }
    const module = { exports: {} };
    modules.set(filename, module);
    const mockedRequire = specifier => {
      if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
      if (/^@babel\/runtime\/helpers\//.test(specifier)) return require(specifier);
      if (specifier.endsWith('.png')) return { testAsset: specifier };
      if (['../components/NavigationBar', '../components/MorphingInfinity'].includes(specifier)) {
        return () => null;
      }
      if (specifier.startsWith('.')) {
        const path = resolve(dirname(filename), specifier);
        const target = [path, `${path}.js`, `${path}.jsx`].find(item => sourceFiles.has(item));
        if (target) return load(target);
      }
      throw new Error(`Unmocked import ${specifier} from ${filename}`);
    };
    // Compile in memory only; an allowlisted require prevents live network/native imports.
    new Function('require', 'module', 'exports', compiled.get(filename))(
      mockedRequire, module, module.exports,
    );
    return module.exports;
  }
  h.helper = load(resolve(appRoot, 'config/photoUrl.js'));
  h.avatar = load(resolve(appRoot, 'components/ProfileImage.jsx'));
  h.api = load(resolve(appRoot, 'config/api.js'));
  const mounted = new Set();
  h.mount = async (source, initialProps = {}) => {
    const Component = load(resolve(appRoot, source)).default;
    let props = initialProps;
    let focus = { active: true, generation: 0 };
    let renderer;
    const element = () => React.createElement(Focus.Provider, { value: focus },
      React.createElement(Component, props));
    await act(async () => {
      renderer = create(element(), {
        createNodeMock: node => node.type === 'TextInput'
          ? { focus: () => h.focusCalls.push(node.props.accessibilityLabel ?? node.props.placeholder) }
          : null,
      });
    });
    mounted.add(renderer);
    return {
      get root() { return renderer.root; },
      async update(nextProps) {
        props = nextProps;
        await act(async () => renderer.update(element()));
      },
      async blur() {
        focus = { ...focus, active: false };
        await act(async () => renderer.update(element()));
      },
      async focus() {
        focus = { active: true, generation: focus.generation + 1 };
        await act(async () => renderer.update(element()));
      },
      async unmount() {
        await act(async () => renderer.unmount());
        mounted.delete(renderer);
      },
    };
  };
  t.after(async () => {
    await act(async () => { for (const renderer of mounted) renderer.unmount(); });
  });
  return h;
}

function input(screen, label) {
  const found = screen.root.findAllByType('TextInput').filter(node =>
    node.props.accessibilityLabel === label || node.props.placeholder === label);
  assert.equal(found.length, 1, `Expected one input: ${label}`);
  return found[0];
}

async function change(screen, label, value) {
  await act(async () => input(screen, label).props.onChangeText(value));
}

function text(screen) {
  return screen.root.findAllByType('Text')
    .flatMap(node => node.children.filter(child => typeof child === 'string')).join('\n');
}

function signupButton(screen) {
  return screen.root.findAllByType('TouchableOpacity').find(node =>
    node.props.accessibilityRole === 'button');
}

function saveButton(screen) {
  return screen.root.findAllByType('TouchableOpacity').find(node =>
    Object.hasOwn(node.props.accessibilityState ?? {}, 'busy'));
}

function avatar(screen) {
  return screen.root.findAll(node => typeof node.type === 'function'
    && node.type.name === 'ProfileImage')[0];
}

function imageUri(screen) {
  return screen.root.findAllByType('Image')
    .filter(node => typeof node.props.source?.uri === 'string')
    .map(node => node.props.source.uri);
}

async function signupForm(h, overrides = {}) {
  const screen = await h.mount('app/SignUpScreen.jsx');
  const fields = {
    'Full Name': ' Ada Lovelace ',
    'Email address': ' ada+qa@example.com ',
    Password: 'correct-password',
    'Phone Number': ' 91234567 ',
    ...overrides,
  };
  for (const [label, value] of Object.entries(fields)) await change(screen, label, value);
  return screen;
}

async function press(button) {
  await act(async () => button.props.onPress());
}

function assertPhotoInput(screen) {
  const { props } = input(screen, 'Photo URL (optional)');
  assert.equal(props.keyboardType, 'url');
  assert.equal(props.autoCapitalize, 'none');
  assert.equal(props.autoCorrect, false);
  assert.match(props.accessibilityHint, /initials/);
  assert.equal(screen.root.findByType('ScrollView').props.keyboardShouldPersistTaps, 'handled');
}

describe('Shared photo URL helper: backend PhotoUrlValidatorTest fixture parity', () => {
  // Mirrors the Java validator fixtures, including Java whitespace and UTF-16 limits.
  const blanks = [null, undefined, '', ' ', '\t\r\n', '\u2003\u00a0'];
  for (const value of blanks) {
    test(`accepts absent/blank ${JSON.stringify(value)}`, t => {
      const { helper } = harness(t);
      assert.equal(helper.getPhotoUrlError(value), '');
      assert.equal(helper.trimPhotoUrl(value), '');
    });
  }
  const valid = [
    'http://example.com/photo', 'https://example.com', 'HTTPS://EXAMPLE.COM/photo',
    'https://example.com:8443/a%20b?size=1&token=a+b%2Fc%25#preview',
    'https://127.0.0.1/photo', 'http://[::1]/photo',
  ];
  for (const value of valid) {
    test(`preserves valid backend fixture ${value}`, t => {
      const { helper } = harness(t);
      const padded = ` \t${value}\r\n\u00a0`;
      assert.equal(helper.getPhotoUrlError(padded), '');
      assert.equal(helper.trimPhotoUrl(padded), value);
    });
  }
  const invalid = [
    '/photo.jpg', '//example.com/photo', 'ftp://example.com/photo',
    'data:image/png;base64,abc', 'javascript:alert(1)', 'https:photo',
    'https:///photo', 'https://', 'https://bad_host/photo', 'https://-bad.com/photo',
    'https://example.com:bad/photo', 'https://user@example.com/photo',
    'https://user:password@example.com/photo', 'https://@example.com/photo',
    'https://example.com/a%', 'https://example.com/a%2', 'https://example.com/a%GG',
    'https://example.com/a b', 'https://example.com/a\tb', 'https://example.com/a\nb',
    'https://example.com/a\u00a0b', 'https://example.com/a\u2003b',
    'https://example.com/\\photo', 'https://example.com/a\u0000b',
  ];
  for (const value of invalid) {
    test(`rejects backend fixture ${JSON.stringify(value)}`, t => {
      const { helper } = harness(t);
      assert.equal(helper.getPhotoUrlError(value), helper.PHOTO_URL_ERROR);
      assert.match(helper.PHOTO_URL_ERROR, /http.*255.*spaces.*login/);
    });
  }
  test('enforces the normalized 255/256-character boundary without truncation', t => {
    const { helper } = harness(t);
    const maximum = 'https://example.com/'.padEnd(255, 'a');
    assert.equal(helper.PHOTO_URL_MAX_LENGTH, 255);
    assert.equal(helper.getPhotoUrlError(`  ${maximum}  `), '');
    assert.equal(helper.trimPhotoUrl(`  ${maximum}  `), maximum);
    assert.equal(helper.getPhotoUrlError(`${maximum}a`), helper.PHOTO_URL_ERROR);
    assert.equal(helper.trimPhotoUrl(`${maximum}a`).length, 256);
  });
});

describe('PHOTO-02: mounted signup', () => {
  test('submits the full trimmed URL and existing fields, then redirects to login', async t => {
    const h = harness(t);
    const screen = await signupForm(h);
    assertPhotoInput(screen);
    await change(screen, 'Photo URL (optional)', ` \t${FULL_PHOTO}\u00a0`);
    await press(signupButton(screen));
    assert.equal(h.axios.post.mock.callCount(), 1);
    assert.deepEqual(h.axios.post.mock.calls[0].arguments, [
      `${h.api.API_BASE_URL}${h.api.ENDPOINTS.SIGNUP}`,
      {
        email: initialUser.email, password: 'correct-password',
        fullName: initialUser.name, contact: initialUser.contact, photoURL: FULL_PHOTO,
      },
      { timeout: 15000 },
    ]);
    assert.deepEqual(h.router.replace.mock.calls[0].arguments, [{
      pathname: '/LoginScreen', params: { email: initialUser.email, registered: '1' },
    }]);
  });

  for (const value of ['', ' \t\u2003\u00a0']) {
    test(`optional ${JSON.stringify(value)} submits null`, async t => {
      const h = harness(t);
      const screen = await signupForm(h);
      await change(screen, 'Photo URL (optional)', value);
      await press(signupButton(screen));
      assert.equal(h.axios.post.mock.callCount(), 1);
      assert.equal(h.axios.post.mock.calls[0].arguments[1].photoURL, null);
      assert.equal(h.router.replace.mock.callCount(), 1);
    });
  }

  for (const value of ['/relative.jpg', 'https://user:secret@example.com/photo', OLD_PHOTO.padEnd(256, 'x')]) {
    test(`invalid photo blocks repeated submit: ${value.slice(0, 50)}`, async t => {
      const h = harness(t);
      const screen = await signupForm(h);
      await change(screen, 'Photo URL (optional)', value);
      await act(async () => input(screen, 'Photo URL (optional)').props.onBlur());
      assert.match(text(screen), /Enter a full http/);
      await press(signupButton(screen));
      await press(signupButton(screen));
      assert.equal(h.axios.post.mock.callCount(), 0);
      assert.equal(h.router.replace.mock.callCount(), 0);
      assert.equal(input(screen, 'Photo URL (optional)').props.value, value);
      assert.ok(h.focusCalls.includes('Photo URL (optional)'));
      assert.equal(screen.root.findAllByType('Text').some(node =>
        node.props.accessibilityRole === 'alert'), true);
      await change(screen, 'Photo URL (optional)', OLD_PHOTO);
      assert.doesNotMatch(text(screen), /Enter a full http/);
      await press(signupButton(screen));
      assert.equal(h.axios.post.mock.callCount(), 1);
    });
  }

  test('same-tick and in-flight duplicate presses send one request and lock all fields', async t => {
    const h = harness(t);
    const pending = deferred();
    h.axios.post.mock.mockImplementation(() => pending.promise);
    const screen = await signupForm(h);
    await change(screen, 'Photo URL (optional)', FULL_PHOTO);
    const submit = signupButton(screen).props.onPress;
    let attempts;
    await act(async () => { attempts = [submit(), submit()]; });
    assert.equal(h.axios.post.mock.callCount(), 1);
    assert.equal(signupButton(screen).props.disabled, true);
    assert.ok(screen.root.findAllByType('TextInput').every(node => node.props.editable === false));
    await act(async () => { await signupButton(screen).props.onPress(); });
    assert.equal(h.axios.post.mock.callCount(), 1);
    await act(async () => {
      pending.resolve({ data: {} });
      await Promise.all(attempts);
    });
    assert.equal(h.router.replace.mock.callCount(), 1);
    assert.equal(signupButton(screen).props.disabled, false);
  });

  const failures = [
    ['duplicate email', { response: { status: 400, data: { message: 'Email already exists' } } }, /already registered/],
    ['backend photo validation', { response: { status: 400, data: { message: 'Photo URL rejected by server' } } }, /Photo URL rejected by server/],
    ['network failure', { request: {} }, /No response from server/],
    ['server failure', { response: { status: 500, data: {} } }, /Could not create account/],
  ];
  for (const [label, failure, message] of failures) {
    test(`${label} retains draft, does not navigate, and permits retry`, async t => {
      const h = harness(t);
      h.axios.post.mock.mockImplementation(async () => { throw failure; });
      const screen = await signupForm(h);
      await change(screen, 'Photo URL (optional)', FULL_PHOTO);
      await press(signupButton(screen));
      assert.match(text(screen), message);
      assert.equal(h.router.replace.mock.callCount(), 0);
      assert.equal(input(screen, 'Photo URL (optional)').props.value, FULL_PHOTO);
      assert.equal(signupButton(screen).props.disabled, false);
      assert.ok(screen.root.findAllByType('TextInput').every(node => node.props.editable));
      h.axios.post.mock.mockImplementation(async () => ({ data: {} }));
      await press(signupButton(screen));
      assert.equal(h.axios.post.mock.callCount(), 2);
      assert.equal(h.router.replace.mock.callCount(), 1);
    });
  }

  for (const [fields, message] of [
    [{ 'Full Name': '', 'Email address': '', Password: '', 'Phone Number': '' }, /fill in full name, email, password, phone number/],
    [{ 'Email address': 'bad-email' }, /Email format is invalid/],
    [{ Password: 'short' }, /at least 6 characters/],
    [{ 'Phone Number': 'abc' }, /at least 8 digits/],
  ]) {
    test(`preserves required-field validation: ${message}`, async t => {
      const h = harness(t);
      const screen = await signupForm(h, fields);
      await press(signupButton(screen));
      assert.equal(h.axios.post.mock.callCount(), 0);
      assert.match(text(screen), message);
    });
  }
});

describe('PHOTO-03: mounted Edit Profile', () => {
  test('photo-only add enables save, revert disables it, and preview preserves the complete URI', async t => {
    const h = harness(t, { photoURL: null });
    const screen = await h.mount('app/EditProfileScreen.jsx');
    assertPhotoInput(screen);
    assert.equal(input(screen, 'Photo URL (optional)').props.value, '');
    assert.equal(saveButton(screen).props.disabled, true);
    assert.deepEqual(imageUri(screen), []);
    assert.match(text(screen), /AL/);
    await change(screen, 'Photo URL (optional)', FULL_PHOTO);
    assert.equal(saveButton(screen).props.disabled, false);
    assert.deepEqual(imageUri(screen), [FULL_PHOTO]);
    await change(screen, 'Photo URL (optional)', '');
    assert.equal(saveButton(screen).props.disabled, true);
    await press(saveButton(screen));
    assert.equal(h.axios.put.mock.callCount(), 0);
    await change(screen, 'Photo URL (optional)', ` ${FULL_PHOTO} `);
    await press(saveButton(screen));
    const [url, body, config] = h.axios.put.mock.calls[0].arguments;
    assert.equal(url, `${h.api.API_BASE_URL}/api/users/id/42`);
    assert.equal(body, null);
    assert.deepEqual(config.params, {
      name: initialUser.name, email: initialUser.email,
      contact: initialUser.contact, photoURL: FULL_PHOTO,
    });
    assert.equal(config.headers.Authorization, 'Bearer qa-token');
    assert.equal(config.timeout, 15000);
    assert.equal(config.signal.aborted, false);
    assert.equal(new URLSearchParams(config.params).get('photoURL'), FULL_PHOTO);
    assert.equal(input(screen, 'Photo URL (optional)').props.value, FULL_PHOTO);
    assert.equal(saveButton(screen).props.disabled, true);
    assert.equal(screen.root.findByType('Modal').props.visible, true);
    await press(saveButton(screen));
    assert.equal(h.axios.put.mock.callCount(), 1);
  });

  test('clear sends explicit empty photo and resets to null/initials on save and reopen', async t => {
    const h = harness(t);
    const screen = await h.mount('app/EditProfileScreen.jsx');
    await change(screen, 'Photo URL (optional)', ' \u2003 ');
    assert.equal(saveButton(screen).props.disabled, false);
    assert.deepEqual(imageUri(screen), []);
    await press(saveButton(screen));
    assert.equal(h.axios.put.mock.calls[0].arguments[2].params.photoURL, '');
    assert.equal(h.user.photoURL, null);
    assert.equal(input(screen, 'Photo URL (optional)').props.value, '');
    assert.equal(saveButton(screen).props.disabled, true);
    await screen.unmount();
    const reopened = await h.mount('app/EditProfileScreen.jsx');
    assert.equal(input(reopened, 'Photo URL (optional)').props.value, '');
    assert.deepEqual(imageUri(reopened), []);
    assert.equal(saveButton(reopened).props.disabled, true);
  });

  test('successful response, not submitted draft, resets every editable baseline', async t => {
    const h = harness(t);
    h.axios.put.mock.mockImplementation(async () => ({ data: {
      ...initialUser, name: 'Server Name', contact: '99887766', photoURL: FULL_PHOTO,
    } }));
    const screen = await h.mount('app/EditProfileScreen.jsx');
    await change(screen, 'Full Name', 'Draft Name');
    await change(screen, 'Phone Number', '88776655');
    await change(screen, 'Photo URL (optional)', 'https://example.com/draft');
    await press(saveButton(screen));
    assert.equal(input(screen, 'Full Name').props.value, 'Server Name');
    assert.equal(input(screen, 'Phone Number').props.value, '99887766');
    assert.equal(input(screen, 'Photo URL (optional)').props.value, FULL_PHOTO);
    assert.equal(saveButton(screen).props.disabled, true);
    for (const [label, value] of [
      ['Full Name', 'Another Name'], ['Phone Number', '87654321'],
      ['Photo URL (optional)', OLD_PHOTO],
    ]) {
      const saved = input(screen, label).props.value;
      await change(screen, label, value);
      assert.equal(saveButton(screen).props.disabled, false);
      await change(screen, label, saved);
      assert.equal(saveButton(screen).props.disabled, true);
    }
  });

  test('unchanged legacy photo is displayed exactly in input and omitted from unrelated updates', async t => {
    const legacy = '`https://example.com/legacy.jpg`';
    const h = harness(t, { photoURL: legacy });
    const screen = await h.mount('app/EditProfileScreen.jsx');
    assert.equal(input(screen, 'Photo URL (optional)').props.value, legacy);
    assert.deepEqual(imageUri(screen), ['https://example.com/legacy.jpg']);
    assert.equal(saveButton(screen).props.disabled, true);
    assert.doesNotMatch(text(screen), /Enter a full http/);
    await change(screen, 'Full Name', 'Grace Hopper');
    await press(saveButton(screen));
    assert.equal(h.axios.put.mock.callCount(), 1);
    assert.equal(Object.hasOwn(h.axios.put.mock.calls[0].arguments[2].params, 'photoURL'), false);
    assert.equal(h.user.photoURL, legacy);
    assert.equal(saveButton(screen).props.disabled, true);
  });

  for (const invalid of ['/relative.jpg', 'https://user@example.com/photo', OLD_PHOTO.padEnd(256, 'x')]) {
    test(`invalid changed photo blocks save: ${invalid.slice(0, 50)}`, async t => {
      const h = harness(t);
      const screen = await h.mount('app/EditProfileScreen.jsx');
      await change(screen, 'Photo URL (optional)', invalid);
      assert.match(text(screen), /Enter a full http/);
      assert.equal(input(screen, 'Photo URL (optional)').props['aria-invalid'], true);
      assert.equal(screen.root.findByProps({ nativeID: 'edit-photo-error' }).props.role, 'alert');
      assert.deepEqual(imageUri(screen), []);
      await press(saveButton(screen));
      assert.equal(h.axios.put.mock.callCount(), 0);
      assert.equal(h.user.photoURL, OLD_PHOTO);
      assert.ok(h.focusCalls.includes('Photo URL (optional)'));
      await change(screen, 'Photo URL (optional)', OLD_PHOTO);
      assert.doesNotMatch(text(screen), /Enter a full http/);
      assert.equal(saveButton(screen).props.disabled, true);
    });
  }

  for (const [label, failure, expected] of [
    ['network', new Error('offline'), /Your changes are still here/],
    ['server validation', { response: { status: 400, data: { message: 'Photo URL rejected by server' } } }, /Photo URL rejected by server/],
  ]) {
    test(`${label} failure retains all drafts and unlocks retry`, async t => {
      const h = harness(t);
      h.axios.put.mock.mockImplementation(async () => { throw failure; });
      const screen = await h.mount('app/EditProfileScreen.jsx');
      await change(screen, 'Full Name', 'Grace Hopper');
      await change(screen, 'Phone Number', '99887766');
      await change(screen, 'Photo URL (optional)', FULL_PHOTO);
      await press(saveButton(screen));
      assert.match(text(screen), expected);
      assert.equal(input(screen, 'Full Name').props.value, 'Grace Hopper');
      assert.equal(input(screen, 'Phone Number').props.value, '99887766');
      assert.equal(input(screen, 'Photo URL (optional)').props.value, FULL_PHOTO);
      assert.equal(h.user.photoURL, OLD_PHOTO);
      assert.equal(saveButton(screen).props.disabled, false);
      assert.ok(screen.root.findAllByType('TextInput').every(node => node.props.editable));
      assert.equal(screen.root.findByType('Modal').props.visible, false);
      h.axios.put.mock.mockImplementation(async () => ({ data: { ...h.user, photoURL: FULL_PHOTO } }));
      await press(saveButton(screen));
      assert.equal(h.axios.put.mock.callCount(), 2);
      assert.equal(saveButton(screen).props.disabled, true);
    });
  }

  test('duplicate save is locked before token retrieval; pending request disables fields and Back', async t => {
    const h = harness(t);
    const screen = await h.mount('app/EditProfileScreen.jsx');
    await change(screen, 'Photo URL (optional)', FULL_PHOTO);
    const token = deferred();
    const response = deferred();
    h.asyncStorage.getItem.mock.mockImplementation(() => token.promise);
    h.axios.put.mock.mockImplementation(() => response.promise);
    const submit = saveButton(screen).props.onPress;
    let attempts;
    await act(async () => { attempts = [submit(), submit()]; });
    assert.equal(h.axios.put.mock.callCount(), 0);
    assert.equal(saveButton(screen).props.disabled, true);
    assert.equal(saveButton(screen).props.accessibilityState.busy, true);
    assert.ok(screen.root.findAllByType('TextInput').every(node => node.props.editable === false));
    assert.ok(screen.root.findAllByType('Pressable').every(node => node.props.disabled === true));
    assert.equal(screen.root.findByProps({ accessibilityLabel: 'Back' }).props.disabled, true);
    await act(async () => token.resolve('qa-token'));
    assert.equal(h.axios.put.mock.callCount(), 1);
    await press(saveButton(screen));
    assert.equal(h.axios.put.mock.callCount(), 1);
    await act(async () => {
      response.resolve({ data: { ...initialUser, photoURL: FULL_PHOTO } });
      await Promise.all(attempts);
    });
    assert.equal(saveButton(screen).props.accessibilityState.busy, false);
    assert.ok(screen.root.findAllByType('TextInput').every(node => node.props.editable));
  });

  test('unsaved Back leaves persistence unchanged and refocus restores the saved draft', async t => {
    const h = harness(t);
    const screen = await h.mount('app/EditProfileScreen.jsx');
    await change(screen, 'Photo URL (optional)', FULL_PHOTO);
    await press(screen.root.findByProps({ accessibilityLabel: 'Back' }));
    assert.equal(h.router.back.mock.callCount(), 1);
    assert.equal(h.axios.put.mock.callCount(), 0);
    await screen.blur();
    await screen.focus();
    assert.equal(input(screen, 'Photo URL (optional)').props.value, OLD_PHOTO);
    assert.equal(saveButton(screen).props.disabled, true);
  });

  test('a late save cannot overwrite a newer focus load or show a success notification', async t => {
    const h = harness(t);
    const response = deferred();
    h.axios.put.mock.mockImplementation(() => response.promise);
    const screen = await h.mount('app/EditProfileScreen.jsx');
    await change(screen, 'Photo URL (optional)', FULL_PHOTO);
    let saving;
    await act(async () => { saving = saveButton(screen).props.onPress(); });
    const signal = h.axios.put.mock.calls[0].arguments[2].signal;
    await screen.blur();
    assert.equal(signal.aborted, true);
    h.user.photoURL = 'https://example.com/newer.jpg';
    await screen.focus();
    await act(async () => {
      response.resolve({ data: { ...initialUser, photoURL: FULL_PHOTO } });
      await saving;
    });
    assert.equal(input(screen, 'Photo URL (optional)').props.value, h.user.photoURL);
    assert.equal(saveButton(screen).props.disabled, true);
    assert.equal(screen.root.findByType('Modal').props.visible, false);
  });
});

describe('PHOTO-03: focus reload and stale-response protection', () => {
  for (const source of ['app/EditProfileScreen.jsx', 'app/ProfileScreen.jsx']) {
    test(`${source}: newer focus wins even when aborted fetch resolves late`, async t => {
      const h = harness(t);
      const old = deferred();
      const latest = deferred();
      h.axios.get.mock.mockImplementationOnce(() => old.promise, 0);
      h.axios.get.mock.mockImplementationOnce(() => latest.promise, 1);
      const screen = await h.mount(source);
      assert.match(text(screen), /Loading profile/);
      const [url, config] = h.axios.get.mock.calls[0].arguments;
      assert.equal(url, `${h.api.API_BASE_URL}/api/users/${encodeURIComponent(initialUser.email)}`);
      assert.equal(config.headers.Authorization, 'Bearer qa-token');
      await screen.blur();
      assert.equal(config.signal.aborted, true);
      await screen.focus();
      assert.equal(h.axios.get.mock.callCount(), 2);
      await act(async () => latest.resolve({ data: { ...initialUser, name: 'Latest User', photoURL: FULL_PHOTO } }));
      assert.deepEqual(imageUri(screen), [FULL_PHOTO]);
      await act(async () => old.resolve({ data: { ...initialUser, name: 'Stale User' } }));
      assert.deepEqual(imageUri(screen), [FULL_PHOTO]);
      assert.equal(avatar(screen).props.name, 'Latest User');
      assert.equal(h.asyncStorage.setItem.mock.callCount(), 1);
      assert.equal(h.router.replace.mock.callCount(), 0);
    });

    test(`${source}: stale fetch error does not redirect or disturb the latest profile`, async t => {
      const h = harness(t);
      const old = deferred();
      h.axios.get.mock.mockImplementationOnce(() => old.promise);
      const screen = await h.mount(source);
      await screen.blur();
      await screen.focus();
      await act(async () => old.reject(new Error('stale network failure')));
      assert.deepEqual(imageUri(screen), [OLD_PHOTO]);
      assert.equal(h.router.replace.mock.callCount(), 0);
      assert.equal(h.alert.mock.callCount(), 0);
      assert.deepEqual(h.errors, []);
    });

    test(`${source}: unmount aborts fetch and ignores its eventual result`, async t => {
      const h = harness(t);
      const pending = deferred();
      h.axios.get.mock.mockImplementation(() => pending.promise);
      const screen = await h.mount(source);
      const signal = h.axios.get.mock.calls[0].arguments[1].signal;
      await screen.unmount();
      assert.equal(signal.aborted, true);
      await act(async () => pending.resolve({ data: initialUser }));
      assert.equal(h.asyncStorage.setItem.mock.callCount(), 0);
      assert.equal(h.router.replace.mock.callCount(), 0);
      assert.deepEqual(h.errors, []);
    });

    test(`${source}: delayed storage after fetch cannot restore stale profile state`, async t => {
      const h = harness(t);
      const pending = deferred();
      h.asyncStorage.setItem.mock.mockImplementationOnce(() => pending.promise);
      const screen = await h.mount(source);
      assert.match(text(screen), /Loading profile/);
      await screen.blur();
      h.user.photoURL = FULL_PHOTO;
      await screen.focus();
      await act(async () => pending.resolve());
      assert.deepEqual(imageUri(screen), [FULL_PHOTO]);
    });

    test(`${source}: missing token redirects without a request`, async t => {
      const h = harness(t);
      h.storage.delete('token');
      await h.mount(source);
      assert.equal(h.axios.get.mock.callCount(), 0);
      assert.deepEqual(h.router.replace.mock.calls[0].arguments, ['/LandingScreen']);
    });
  }

  test('Profile -> edit -> save -> return -> reopen shows replacements and clearing', async t => {
    const h = harness(t);
    const profile = await h.mount('app/ProfileScreen.jsx');
    assert.deepEqual(imageUri(profile), [OLD_PHOTO]);
    const editLink = profile.root.findAllByType('TouchableOpacity').find(node =>
      node.findAllByType('Text').some(child => child.children.includes('Edit Profile')));
    await press(editLink);
    assert.deepEqual(h.router.push.mock.calls[0].arguments, ['/EditProfileScreen']);
    for (const photo of [FULL_PHOTO, '']) {
      await profile.blur();
      const edit = await h.mount('app/EditProfileScreen.jsx');
      assert.equal(input(edit, 'Photo URL (optional)').props.value, h.user.photoURL ?? '');
      await change(edit, 'Photo URL (optional)', photo);
      await press(saveButton(edit));
      await edit.unmount();
      await profile.focus();
      assert.deepEqual(imageUri(profile), photo ? [photo] : []);
      assert.equal(avatar(profile).props.uri, photo || null);
      assert.match(text(profile), /Ada Lovelace/);
      assert.match(text(profile), /91234567/);
    }
    const reopened = await h.mount('app/EditProfileScreen.jsx');
    assert.equal(input(reopened, 'Photo URL (optional)').props.value, '');
    assert.equal(saveButton(reopened).props.disabled, true);
    assert.equal(h.axios.put.mock.callCount(), 2);
    assert.equal(h.axios.get.mock.callCount(), 6);
  });
});

describe('PHOTO-03: shared mounted ProfileImage', () => {
  test('preserves valid Unicode/apostrophes, URL encoding, full URI, size and resize mode', async t => {
    const h = harness(t);
    assert.equal(h.avatar.normalizeProfileImageUrl(` ${FULL_PHOTO} `), FULL_PHOTO);
    const style = { width: 156, height: 156, borderRadius: 78 };
    const screen = await h.mount('components/ProfileImage.jsx', {
      uri: FULL_PHOTO, name: 'Ada Lovelace', style, resizeMode: 'contain',
      screen: 'ChatScreen', role: 'chat-partner', userId: 42,
    });
    const image = screen.root.findByType('Image');
    assert.deepEqual(image.props.source, { uri: FULL_PHOTO });
    assert.deepEqual(image.props.style, style);
    assert.equal(image.props.resizeMode, 'contain');
    await act(async () => image.props.onLoad());
    assert.deepEqual(imageUri(screen), [FULL_PHOTO]);
    assert.ok(h.logs.some(([event]) => event === '[ProfileImage] loaded'));
  });

  test('failed image shows initials and a different valid URL recovers without remounting', async t => {
    const h = harness(t);
    const screen = await h.mount('components/ProfileImage.jsx', { uri: OLD_PHOTO, name: 'Ada Lovelace' });
    await act(async () => screen.root.findByType('Image').props.onError({
      nativeEvent: { error: 'mock image unavailable' },
    }));
    assert.deepEqual(imageUri(screen), []);
    assert.equal(text(screen), 'AL');
    await screen.update({ uri: FULL_PHOTO, name: 'Ada Lovelace' });
    assert.deepEqual(imageUri(screen), [FULL_PHOTO]);
    await act(async () => screen.root.findByType('Image').props.onLoad());
    assert.deepEqual(imageUri(screen), [FULL_PHOTO]);
    await screen.update({ uri: null, name: 'Ada Lovelace' });
    assert.deepEqual(imageUri(screen), []);
    assert.equal(text(screen), 'AL');
  });

  test('no photo/name shows fallback; legacy wrappers still render a full URL', async t => {
    const h = harness(t);
    const screen = await h.mount('components/ProfileImage.jsx', { uri: null, name: null });
    assert.equal(text(screen), '?');
    assert.deepEqual(imageUri(screen), []);
    await screen.update({ uri: `\`"${OLD_PHOTO}"\``, name: 'Grace Hopper', role: 'owner' });
    assert.deepEqual(imageUri(screen), [OLD_PHOTO]);
    await act(async () => screen.root.findByType('Image').props.onError({ message: 'mock unavailable' }));
    assert.equal(text(screen), 'GH');
  });

  test('broken preview does not block saving a syntactically valid photo', async t => {
    const h = harness(t);
    const screen = await h.mount('app/EditProfileScreen.jsx');
    await change(screen, 'Photo URL (optional)', FULL_PHOTO);
    const image = screen.root.findAllByType('Image').find(node => node.props.source?.uri);
    await act(async () => image.props.onError({ nativeEvent: { error: '404' } }));
    assert.deepEqual(imageUri(screen), []);
    assert.equal(saveButton(screen).props.disabled, false);
    await press(saveButton(screen));
    assert.equal(h.axios.put.mock.calls[0].arguments[2].params.photoURL, FULL_PHOTO);
    assert.equal(saveButton(screen).props.disabled, true);
  });
});
