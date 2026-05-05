import { Link } from 'react-router-dom';
import AuthIllustrationPanel from './AuthIllustrationPanel';

export default function AuthPageLayout({
  title,
  eyebrow,
  description,
  variant,
  children,
  footerText,
  footerLinkLabel,
  footerLinkTo,
}) {
  return (
    <div className="min-h-screen bg-transparent px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-[1440px] gap-8 rounded-[40px] border border-line/80 bg-white/90 p-4 shadow-hero lg:grid-cols-[minmax(0,1fr)_minmax(540px,620px)] lg:p-10">
        <div className="flex items-center justify-center">
          <div className="w-full max-w-[560px] rounded-[32px] bg-white px-2 py-8 sm:px-6 lg:px-0">
            <div className="mb-8 flex items-center gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-[18px] bg-hero shadow-panel">
                <span className="h-[18px] w-[18px] rounded-full bg-white shadow-[0_0_0_8px_rgba(255,255,255,0.2)]" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{eyebrow}</p>
                <h1 className="mt-2 text-4xl font-bold leading-tight text-ink">{title}</h1>
              </div>
            </div>
            <p className="mb-8 max-w-xl text-base text-muted">{description}</p>
            {children}
            <p className="mt-6 text-sm text-muted">
              {footerText}{' '}
              <Link className="font-bold text-brand" to={footerLinkTo}>
                {footerLinkLabel}
              </Link>
            </p>
          </div>
        </div>

        <AuthIllustrationPanel variant={variant} />
      </div>
    </div>
  );
}
