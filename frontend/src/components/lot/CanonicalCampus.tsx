import type { ReactNode } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { DEFAULT_CAMPUS_SLUG } from '../../lib/routes';

export function CanonicalCampus({ children }: { children: ReactNode }) {
  const { campusSlug } = useParams();
  const { search, hash } = useLocation();
  return campusSlug === DEFAULT_CAMPUS_SLUG ? (
    <Navigate to={{ pathname: '/', search, hash }} replace />
  ) : (
    children
  );
}
