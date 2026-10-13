import React from 'react';
import { act } from 'react-test-renderer';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ChatsScreen2 from '../../app/ChatsScreen2';
import EnquiryPreview from '../../components/EnquiryPreview';
import { chatData } from '../../config/chatData';
import { render, text, buttons, press, button, deferred } from './helpers';

let params, messages, options, rentals, router;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  chatData.clear('test');
  params = { currentUser: '22', partnerUserId: '11', enquiryListingId: '59' };
  messages = [];
  options = [
    { listingId: 59, name: 'Bishan flat', address: 'Bishan Street 12', enquired: true },
    { listingId: 60, name: 'Tampines flat', address: 'Tampines Avenue 4', enquired: false },
  ];
  rentals = {
    81: { rentalID: 81, listingId: 59, listingName: 'Bishan flat', listingLocation: 'Bishan Street 12', ownerUserId: 11, tenantUserID: 22, status: 'pending', rentalPrice: 3000, depositPrice: 3000 },
    82: { rentalID: 82, listingId: 60, listingName: 'Tampines flat', listingLocation: 'Tampines Avenue 4', ownerUserId: 11, tenantUserID: 22, status: 'pending', rentalPrice: 5000, depositPrice: 5000 },
  };
  router = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
  useRouter.mockReturnValue(router);
  useLocalSearchParams.mockImplementation(() => params);
  AsyncStorage.getItem.mockResolvedValue('test-token');
  jwtDecode.mockReturnValue({
    sub: 'viewer@example.test',
    exp: Math.floor(Date.now() / 1000) + 3600,
  });
  axios.get.mockImplementation(async url => {
    if (url.includes('/chathistory/conversations/')) {
      const partnerId = Number(params.partnerUserId);
      return {
        status: 200,
        data: {
          partner: { userID: partnerId, name: 'Chat partner', photoURL: null, flagged: 0 },
          messages,
          hasMore: false,
        },
      };
    }
    if (url.includes('/offer-options')) return { data: options };
    if (url.includes('/rentals/')) return { data: rentals[url.split('/').pop()] };
    if (url.includes('/users/id/')) return { data: { name: 'Chat partner', userID: Number(params.partnerUserId) } };
    if (url.includes('/listings/')) return { data: { name: 'Bishan flat', location: 'Bishan Street 12', ownerId: 11 } };
    throw new Error(url);
  });
  axios.post.mockImplementation(async (url, body) => ({ status: 201, data: {
    messageID: 100, senderId: Number(params.currentUser), message: body.message,
    listingId: body.listingID, listingNameSnapshot: body.listingID ? 'Bishan flat' : null,
    listingAddressSnapshot: body.listingID ? 'Bishan Street 12' : null,
  } }));
});

async function type(ui, placeholder, value) {
  await act(async () => { ui.root.findAllByType('TextInput').find(input => input.props.placeholder === placeholder).props.onChangeText(value); });
}

test('opening prepares a preview without sending and a sent enquiry carries its listing ID', async () => {
  const ui = await render(<ChatsScreen2 />);
  expect(axios.post).not.toHaveBeenCalled();
  expect(ui.root.findAllByType(EnquiryPreview)).toHaveLength(1);
  expect(ui.root.findByType(EnquiryPreview).props.variant).toBe('draft');
  expect(text(ui.toJSON())).toContain('Enquiring about');
  await type(ui, 'Enter Message', 'Can I view this flat?');
  await press(ui, 'Send message');
  expect(axios.post.mock.calls[0][1]).toMatchObject({ listingID: 59, rentalID: null, requestID: null });
  const preview = ui.root.findAllByType(EnquiryPreview)[0];
  expect(preview.props.onRemove).toBeUndefined();
  expect(preview.props.name).toBe('Bishan flat');
});

test('removing attachment sends plain text and switching conversation clears the draft', async () => {
  const ui = await render(<ChatsScreen2 />);
  await type(ui, 'Enter Message', 'Hello');
  await press(ui, 'Remove property attachment');
  expect(ui.root.findAllByType('TextInput').find(i => i.props.placeholder === 'Enter Message').props.value).toBe('Hello');
  await press(ui, 'Send message');
  expect(axios.post.mock.calls[0][1].listingID).toBeNull();
  params = { currentUser: '22', partnerUserId: '33' };
  await act(async () => ui.update(<ChatsScreen2 />));
  expect(ui.root.findAllByType(EnquiryPreview)).toHaveLength(0);
  expect(ui.root.findAllByType('TextInput').find(i => i.props.placeholder === 'Enter Message').props.value).toBe('');
});

test('two saved enquiries and deleted-property snapshots remain distinct', async () => {
  params.enquiryListingId = undefined;
  messages = [
    { messageID: 1, senderId: 22, listingId: 59, listingNameSnapshot: 'Bishan flat', message: 'First', date: '2026-10-12' },
    { messageID: 2, senderId: 22, listingId: null, listingNameSnapshot: 'Removed property', listingAddressSnapshot: 'Old address', message: 'Second', date: '2026-10-12' },
  ];
  const ui = await render(<ChatsScreen2 />);
  const previews = ui.root.findAllByType(EnquiryPreview);
  expect(previews.map(p => p.props.name)).toEqual(['Bishan flat', 'Removed property']);
  expect(text(ui.toJSON())).toContain('Listing no longer available');
  const viewButtons = buttons(ui).filter(b => text(b) === 'View listing');
  expect(viewButtons).toHaveLength(1);
  expect(viewButtons[0].props.accessibilityRole).toBe('button');
  expect(viewButtons[0].props.style).toMatchObject({ minHeight: 44, width: '100%', borderWidth: 1, backgroundColor: 'transparent' });
  expect(previews[0].props.variant).not.toBe('draft');
  const stack = previews[0].parent;
  expect(stack.props.style.backgroundColor).toBeUndefined();
  const messageBubble = stack.children[1];
  expect(messageBubble.props.style).toEqual(expect.arrayContaining([
    expect.objectContaining({ backgroundColor: '#2563EB' }),
    expect.objectContaining({ alignSelf: 'flex-end' }),
  ]));
  expect(text(messageBubble)).toBe('First');
  expect(messageBubble.findAllByType(EnquiryPreview)).toHaveLength(0);
  await press(ui, 'View listing');
  expect(router.push).toHaveBeenCalledWith({ pathname: '/HomeListingScreen', params: { listingId: 59 } });
});

test('received enquiry separates navigation from the offer action and preserves full snapshot text', async () => {
  params = { currentUser: '11', partnerUserId: '22' };
  const name = 'Spacious Jurong East Flat - 105';
  messages = [{ messageID: 1, senderId: 22, listingId: 59, listingNameSnapshot: name,
    listingAddressSnapshot: '105 JURONG EAST STREET 13, Singapore 600105',
    message: 'Hi is this available?', date: '2026-10-12' }];
  const ui = await render(<ChatsScreen2 />);
  expect(text(ui.toJSON())).toContain(name);
  const messageBubble = ui.root.findByType(EnquiryPreview).parent.children[1];
  expect(messageBubble.props.style).toEqual(expect.arrayContaining([
    expect.objectContaining({ backgroundColor: '#F0F0F0' }),
    expect.objectContaining({ alignSelf: 'flex-start' }),
  ]));
  const link = buttons(ui).find(b => text(b) === 'View listing');
  expect(text(link)).not.toContain('Offer this property');
  await press(ui, 'Offer this property');
  expect(buttons(ui).filter(b => b.props.accessibilityState?.checked).map(b => b.props.accessibilityLabel))
    .toEqual(['Bishan flat, Bishan Street 12']);
});

test('offer form lists all eligible owned properties and requires explicit selection', async () => {
  params = { currentUser: '11', partnerUserId: '22' };
  const ui = await render(<ChatsScreen2 />);
  await act(async () => buttons(ui).find(b => b.props.style?.marginRight === undefined &&
    b.findAllByType('FontAwesome').some(icon => icon.props.name === 'paperclip')).props.onPress());
  expect(text(ui.toJSON())).toContain('Enquired-about properties');
  expect(text(ui.toJSON())).toContain('Other properties you own');
  expect(button(ui, 'Send offer').props.disabled).toBe(true);
  await press(ui, 'Tampines flat, Tampines Avenue 4');
  const fields = ui.root.findAllByType('TextInput');
  await act(async () => {
    fields.find(i => i.props.value === '' && i.props.keyboardType === 'numeric').props.onChangeText('5000');
  });
  expect(buttons(ui).filter(b => b.props.accessibilityState?.checked).map(b => b.props.accessibilityLabel))
    .toEqual(['Tampines flat, Tampines Avenue 4']);
});

test('each offer card and acceptance dialog uses its own property and amount', async () => {
  params.enquiryListingId = undefined;
  messages = [81, 82].map((id, index) => ({ messageID: index + 1, senderId: 11, rentalId: id, date: '2026-10-12' }));
  const ui = await render(<ChatsScreen2 />);
  expect(text(ui.toJSON())).toContain('Bishan flat');
  expect(text(ui.toJSON())).toContain('Tampines flat');
  const acceptButtons = buttons(ui).filter(b => text(b) === 'Accept offer');
  await act(async () => acceptButtons[0].props.onPress());
  expect(ui.root.findAllByType('Text').filter(t => text(t) === 'Bishan flat')).toHaveLength(2);
  expect(ui.root.findAllByType('Text').filter(t => text(t) === 'Tampines flat')).toHaveLength(1);
});

test('late enquiry options cannot preselect a reopened general offer form', async () => {
  params = { currentUser: '11', partnerUserId: '22' };
  messages = [{ messageID: 1, senderId: 22, listingId: 59, listingNameSnapshot: 'Bishan flat', message: 'Viewing?', date: '2026-10-12' }];
  const pending = deferred();
  const originalGet = axios.get.getMockImplementation();
  let optionCalls = 0;
  axios.get.mockImplementation(url => url.includes('/offer-options') && optionCalls++ === 0
    ? pending.promise : originalGet(url));
  const ui = await render(<ChatsScreen2 />);
  let firstOpening;
  await act(async () => { firstOpening = button(ui, 'Offer this property').props.onPress(); });
  await press(ui, 'Close rental offer');
  await act(async () => buttons(ui).find(b =>
    b.findAllByType('FontAwesome').some(icon => icon.props.name === 'paperclip')).props.onPress());
  await act(async () => { pending.resolve({ data: options }); await firstOpening; });
  expect(buttons(ui).filter(b => b.props.accessibilityState?.checked)).toHaveLength(0);
});

test('fractional amounts explain why sending is disabled', async () => {
  params = { currentUser: '11', partnerUserId: '22' };
  const ui = await render(<ChatsScreen2 />);
  await act(async () => buttons(ui).find(b =>
    b.findAllByType('FontAwesome').some(icon => icon.props.name === 'paperclip')).props.onPress());
  await act(async () => ui.root.findAllByType('TextInput').find(input =>
    input.props.accessibilityLabel === 'Monthly rent').props.onChangeText('3000.50'));
  expect(text(ui.toJSON())).toContain('Enter a positive whole-dollar amount');
  expect(button(ui, 'Send offer').props.disabled).toBe(true);
});

test('failed enquiries retry with the same property reference', async () => {
  axios.post.mockRejectedValueOnce(new Error('offline'));
  const ui = await render(<ChatsScreen2 />);
  await type(ui, 'Enter Message', 'Viewing?');
  await press(ui, 'Send message');
  expect(text(ui.toJSON())).toContain('Failed');
  await press(ui, 'Retry');
  expect(axios.post.mock.calls.map(call => call[1].listingID)).toEqual([59, 59]);
});


const renderScrollableChat = async () => {
  const scrollToEnd = jest.fn();
  const ui = await render(<ChatsScreen2 />, {
    createNodeMock: node => node.type === 'ScrollView' && node.props.onContentSizeChange
      ? { scrollToEnd } : null,
  });
  const layoutMessages = async () => {
    const list = ui.root.findAllByType('ScrollView').find(node => node.props.onContentSizeChange);
    await act(async () => list.props.onContentSizeChange(390, 1800));
  };
  return { ui, scrollToEnd, layoutMessages };
};

test.each([undefined, '59'])('animates to the rendered outgoing message with attachment %s', async attachment => {
  params.enquiryListingId = attachment;
  const { ui, scrollToEnd, layoutMessages } = await renderScrollableChat();
  await type(ui, 'Enter Message', 'Can we arrange a viewing?');
  await press(ui, 'Send message');
  expect(scrollToEnd).not.toHaveBeenCalled();
  await layoutMessages();
  expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  expect(scrollToEnd).toHaveBeenCalledTimes(1);
  await layoutMessages();
  expect(scrollToEnd).toHaveBeenCalledTimes(1);
});

test('an empty send does not request a scroll', async () => {
  const { ui, scrollToEnd, layoutMessages } = await renderScrollableChat();
  await press(ui, 'Send message');
  await layoutMessages();
  expect(axios.post).not.toHaveBeenCalled();
  expect(scrollToEnd).not.toHaveBeenCalled();
});

test('a sent offer scrolls after its card is loaded and laid out', async () => {
  params = { currentUser: '11', partnerUserId: '22' };
  messages = [{ messageID: 1, senderId: 22, listingId: 59, listingNameSnapshot: 'Bishan flat', message: 'Viewing?', date: '2026-10-12' }];
  const { ui, scrollToEnd, layoutMessages } = await renderScrollableChat();
  await press(ui, 'Offer this property');
  for (const [label, value] of [['Monthly rent', '3000'], ['Rental deposit', '3000']]) {
    const field = ui.root.findAllByType('TextInput').find(node => node.props.accessibilityLabel === label);
    await act(async () => field.props.onChangeText(value));
  }
  const dateFields = ui.root.findAllByType('TextInput').filter(node => node.props.placeholder === 'DD-MM-YYYY');
  await act(async () => dateFields[0].props.onChangeText('01-11-2026'));
  await act(async () => dateFields[1].props.onChangeText('01-11-2027'));
  axios.post.mockImplementation(async () => {
    messages = [...messages, { messageID: 2, senderId: 11, rentalId: 81, message: 'Rental Offer', date: '2026-10-13' }];
    return { status: 201, data: rentals[81] };
  });
  scrollToEnd.mockClear();
  await press(ui, 'Send offer');
  expect(text(ui.toJSON())).toContain('Bishan flat');
  await layoutMessages();
  expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
});

test('returning after a sent termination request scrolls to its rendered card', async () => {
  params = { currentUser: '11', partnerUserId: '22', scrollAfterSend: 'true' };
  messages = [{ messageID: 3, senderId: 11, requestId: 71, date: '2026-10-13' }];
  const originalGet = axios.get.getMockImplementation();
  axios.get.mockImplementation(url => url.includes('/requests/71')
    ? Promise.resolve({ data: { requestID: 71, status: 'pending', tenantUserId: 22, refundAmount: 100 } })
    : url.includes('/users/viewer') ? Promise.resolve({ data: { userID: 11 } }) : originalGet(url));
  const { ui, scrollToEnd, layoutMessages } = await renderScrollableChat();
  expect(text(ui.toJSON())).toContain('Pending');
  await layoutMessages();
  expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
});
