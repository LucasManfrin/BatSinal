import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup, configure } from '@testing-library/react';

afterEach(cleanup);
configure({ asyncUtilTimeout: 3000 });
