import { ArrowLeft, Clock3 } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { findBlogPost } from "../content/blog";

export function BlogArticlePage() {
  const { slug } = useParams();
  const post = findBlogPost(slug);
  if (!post) return <Navigate to="/404" replace />;

  return (
    <main className="commerce-page blog-article-page">
      <Seo
        title={post.title}
        description={post.excerpt}
        canonicalPath={`/blog/${post.slug}`}
        type="article"
        schema={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedIso,
          dateModified: post.publishedIso,
          mainEntityOfPage: `https://ysello.com/blog/${post.slug}`,
          author: {
            "@type": "Organization",
            name: "Ysello",
            url: "https://ysello.com",
          },
          publisher: {
            "@type": "Organization",
            name: "Ysello",
            url: "https://ysello.com",
          },
        }}
      />
      <MarketHeader />
      <article className={`blog-article tone-${post.color}`}>
        <Link className="blog-back" to="/blog">
          <ArrowLeft size={16} /> All field notes
        </Link>
        <header>
          <span>{post.tag}</span>
          <h1>{post.title}</h1>
          <p>{post.excerpt}</p>
          <small>
            <Clock3 size={15} /> {post.time} read · {post.published}
          </small>
        </header>
        <div className="blog-article-body">
          {post.sections.map((section, index) => (
            <section key={section.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{section.title}</h2>
                <p>{section.body}</p>
              </div>
            </section>
          ))}
        </div>
      </article>
      <MarketFooter />
    </main>
  );
}
