-- Table articles de blog (migration contenu depuis lib/blog/articles.ts)
CREATE TABLE IF NOT EXISTS blog_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL,
  read_time integer NOT NULL DEFAULT 5,
  content text NOT NULL DEFAULT '',
  published_at date NOT NULL DEFAULT CURRENT_DATE,
  published boolean NOT NULL DEFAULT false,
  beta_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS blog_articles_published_idx ON blog_articles (published, published_at DESC);
