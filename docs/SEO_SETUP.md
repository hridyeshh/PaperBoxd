# SEO Setup for PaperBoxd

## ✅ Completed

### 1. Sitemap (`app/sitemap.ts`)
- Created dynamic sitemap with main pages
- Includes homepage, auth, recommendations, search, and feed
- Automatically accessible at `https://paperboxd.in/sitemap.xml`

### 2. Robots.txt (`public/robots.txt`)
- Allows all search engines to crawl public pages
- Blocks API routes and private pages
- Points to sitemap location

### 3. Enhanced Metadata (`app/layout.tsx`)
- Comprehensive meta tags with title, description, keywords
- Open Graph tags for social sharing
- Twitter Card metadata
- Proper robots directives
- Canonical URLs

### 4. Structured Data (`app/b/[slug]/page.tsx`)
- JSON-LD structured data for book pages
- Includes Schema.org Book markup
- Author, publisher, ratings, and review information
- Enables rich snippets in Google search results

## 📋 Next Steps (Manual Actions Required)

### 1. Google Search Console Setup
1. Go to https://search.google.com/search-console
2. Add property: `paperboxd.in`
3. Verify ownership via:
   - **DNS method** (recommended): Add TXT record to your domain
   - **HTML file method**: Upload HTML file to your site
4. Submit sitemap: `https://paperboxd.in/sitemap.xml`
5. Request indexing for homepage using URL Inspection tool

### 2. Test Your Setup
```bash
# Check sitemap is accessible
curl https://paperboxd.in/sitemap.xml

# Check robots.txt
curl https://paperboxd.in/robots.txt

# Test with Google's Rich Results Test
# https://search.google.com/test/rich-results
```

### 3. Verify Meta Tags
Visit your site and check:
- View page source → Look for `<meta>` tags
- Check Open Graph tags with: https://www.opengraph.xyz/
- Test Twitter cards: https://cards-dev.twitter.com/validator

### 4. Performance Check
```bash
# Run Lighthouse audit
npx lighthouse https://paperboxd.in --view

# Key metrics to aim for:
# - LCP: < 2.5s
# - FID: < 100ms  
# - CLS: < 0.1
```

## 🔍 Additional SEO Improvements (Future)

### 1. Dynamic Metadata for Book Pages
Currently book pages are client components. Consider:
- Creating a server component wrapper for metadata
- Or using `next/head` for dynamic meta tags

### 2. Expand Sitemap
Add dynamic routes:
- Individual book pages (`/b/[slug]`)
- User profile pages (`/u/[username]`)
- Public reading lists

### 3. Content Pages
Add static content pages:
- `/about` - About PaperBoxd
- `/privacy` - Privacy policy (already exists in footer)
- `/terms` - Terms of service (already exists in footer)

### 4. Blog/Articles
Create content marketing:
- "Top 10 Books of 2025"
- "How to Track Your Reading Goals"
- "Building Your Reading Community"

## 📊 Monitoring

### Weekly Checks
1. Google Search Console → Coverage → Check for errors
2. Search "paperboxd" on Google (use incognito mode)
3. Monitor organic search traffic

### Expected Timeline
- **Days 1-3**: Submit to Search Console
- **Week 1**: Google crawls your site
- **Week 2-4**: "paperboxd" search shows your site
- **Month 2-3**: Ranking for related keywords
- **Month 6+**: Organic traffic from long-tail searches

## 🚨 Important Notes

1. **Don't expect instant results** - SEO takes time (weeks to months)
2. **Keep your site updated** - Fresh content helps rankings
3. **Monitor Search Console** - Fix any errors immediately
4. **Be patient** - Google needs time to discover and index your site

## 🔗 Useful Resources

- [Google Search Console](https://search.google.com/search-console)
- [Rich Results Test](https://search.google.com/test/rich-results)
- [PageSpeed Insights](https://pagespeed.web.dev/)
- [Schema.org Documentation](https://schema.org/Book)

