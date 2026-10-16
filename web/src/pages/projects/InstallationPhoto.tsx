// The photo of an article on an installation sheet (its main photo, `photoFileId`), or an empty square.
import { fileContentUrl } from '../../api/queries/file'
import type { InstallationArticle } from '../../api/queries/installationSheet'

export function InstallationPhoto({ article, className }: { article: InstallationArticle; className: string }) {
  return article.photoFileId !== null ? (
    <img src={fileContentUrl(article.photoFileId)} alt="" className={`bg-surface object-contain ${className}`} />
  ) : (
    <div className={`bg-sunken ${className}`} aria-hidden="true" />
  )
}
