import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { Link } from "react-router-dom";
import { MarketFooter, MarketHeader } from "../components/MarketHeader";
import { Seo } from "../components/Seo";
import { blogPosts } from "../content/blog";

export function BlogPage() {
  return (
    <main className="commerce-page">
      <Seo
        title="Marketplace field notes"
        description="Practical guides for buying, selling, licensing, delivery, and trust in digital marketplaces."
        canonicalPath="/blog"
        type="website"
      />
      <MarketHeader />
      <section className="blog-hero">
        <BookOpen />
        <span className="section-index">FIELD NOTES</span>
        <h1>
          Better digital trade,
          <br />
          explained plainly.
        </h1>
        <p>
          Guides for buyers, sellers, and people who have read enough vague
          marketplace advice for one lifetime.
        </p>
      </section>
      <section className="blog-grid" aria-label="Marketplace guides">
        {blogPosts.map((post, index) => (
          <article className={`blog-card tone-${post.color}`} key={post.title}>
            <span>0{index + 1}</span>
            <small>{post.tag}</small>
            <h2>
              <Link to={`/blog/${post.slug}`}>{post.title}</Link>
            </h2>
            <p>{post.excerpt}</p>
            <footer>
              <span>
                <Clock3 /> {post.time} read
              </span>
              <Link to={`/blog/${post.slug}`}>
                Read guide <ArrowRight />
              </Link>
            </footer>
          </article>
        ))}
      </section>
      <MarketFooter />
    </main>
  );
}
