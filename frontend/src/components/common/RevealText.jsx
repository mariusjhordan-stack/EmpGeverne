import { RevealLines } from './Reveal';

export default function RevealText({ as = 'span', children, className = '' }) {
  return <RevealLines as={as} className={className} lines={[children]} />;
}
