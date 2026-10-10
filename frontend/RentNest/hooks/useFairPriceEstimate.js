import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_BASE_URL, ENDPOINTS } from '../config/api';

/**
 * Fetches an AI fair-price estimate for a property described by its attributes.
 * Used on the create / edit listing screens so owners see a suggested range as
 * they fill in the form. Requests are debounced and only sent once the fields
 * the model needs (type, 6-digit postal code, bedrooms) are present.
 *
 * Returns { estimate, loading }.
 */
const useFairPriceEstimate = ({ token, type, postal, beds, size, floor }, debounceMs = 700) => {
  const [estimate, setEstimate] = useState(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const postalStr = postal == null ? '' : String(postal).trim();
  const ready = !!token && !!type && /^\d{6}$/.test(postalStr) && beds !== null && beds !== '' && !isNaN(beds);

  useEffect(() => {
    if (!ready) {
      setEstimate(null);
      setLoading(false);
      return undefined;
    }

    const id = ++requestId.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = { type, postal: Number(postalStr), beds: Number(beds) };
        if (size && !isNaN(size) && Number(size) > 0) params.size = Number(size);
        if (floor && !isNaN(floor) && Number(floor) > 0) params.floor = Number(floor);

        const response = await axios.get(`${API_BASE_URL}${ENDPOINTS.PRICING_ESTIMATE}`, {
          params,
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        });
        if (id === requestId.current) setEstimate(response.data);
      } catch (error) {
        console.error('Error fetching fair price estimate:', error?.message);
        if (id === requestId.current) {
          setEstimate({ available: false, message: 'Could not reach the pricing service.' });
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [token, type, postalStr, beds, size, floor, ready, debounceMs]);

  return { estimate, loading };
};

export default useFairPriceEstimate;
