import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@douyinfe/semi-ui', () => ({ Toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock('../../App', () => ({
  default: {
    apiClient: {
      get: vi.fn(),
    },
  },
}))

const mockTrack = vi.fn()
vi.mock('../../Service/Dap', () => ({
  Dap: {
    shared: {
      track: (...args: unknown[]) => mockTrack(...args),
    },
  },
}))

import { downloadFile, getPresignedDownloadUrl, getPresignedPreviewUrl, classifyDownloadFileType } from '../download'
import WKApp from '../../App'

describe('downloadFile', () => {
  let capturedAnchor: HTMLAnchorElement | null = null

  beforeEach(() => {
    capturedAnchor = null
    vi.resetAllMocks()
    vi.spyOn(document.body, 'appendChild').mockImplementation((node: Node) => {
      capturedAnchor = node as HTMLAnchorElement
      ;(node as HTMLAnchorElement).click = vi.fn()
      return node
    })
    vi.spyOn(document.body, 'removeChild').mockImplementation((node: Node) => node)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls presigned API for cross-origin URLs', async () => {
    vi.mocked(WKApp.apiClient.get).mockResolvedValue({ url: 'https://cdn.example.com/signed-url', filename: 'photo.png' })

    await downloadFile('https://cdn.example.com/image.png', 'photo.png')

    expect(WKApp.apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('file/download/url?path=')
    )
    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.href).toBe('https://cdn.example.com/signed-url')
  })

  it('does not add response-content-disposition to cross-origin URLs', async () => {
    vi.mocked(WKApp.apiClient.get).mockResolvedValue({ url: 'https://cdn.example.com/signed', filename: 'photo.png' })

    await downloadFile('https://cdn.example.com/image.png', 'photo.png')

    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.href).not.toContain('response-content-disposition')
  })

  it('falls back to original URL when presigned API fails', async () => {
    vi.mocked(WKApp.apiClient.get).mockRejectedValue(new Error('network'))

    await downloadFile('https://cdn.example.com/image.png', 'photo.png')

    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.href).toBe('https://cdn.example.com/image.png')
  })

  it('does nothing for empty URL', async () => {
    await downloadFile('', 'photo.png')
    expect(capturedAnchor).toBeNull()
  })

  it('does nothing for javascript: URL', async () => {
    await downloadFile('javascript:alert(1)', 'photo.png')
    expect(capturedAnchor).toBeNull()
  })

  it('uses the original URL when the download helper returns no signed URL', async () => {
    vi.mocked(WKApp.apiClient.get).mockResolvedValue({})

    await expect(getPresignedDownloadUrl('/files/a.txt', 'a.txt')).resolves.toBe('/files/a.txt')
  })

  it('requests inline disposition for preview URLs', async () => {
    vi.mocked(WKApp.apiClient.get).mockResolvedValue({ url: 'https://cdn.example.com/preview' })

    await expect(getPresignedPreviewUrl('/files/a.pdf', 'a.pdf')).resolves.toBe('https://cdn.example.com/preview')
    expect(WKApp.apiClient.get).toHaveBeenCalledWith(
      'file/download/url?path=%2Ffiles%2Fa.pdf&filename=a.pdf&disposition=inline'
    )
  })

  it('downloads same-origin URLs without requesting a presigned URL', async () => {
    await downloadFile('/files/a.txt', 'a.txt')

    expect(WKApp.apiClient.get).not.toHaveBeenCalled()
    expect(capturedAnchor).not.toBeNull()
    expect(capturedAnchor!.href).toBe(`${window.location.origin}/files/a.txt`)
  })
})

describe('message_file_downloaded file_type privacy guard', () => {
  // 隐私红线:file_type 绝不透传用户可控的文件名正文,只能是已知扩展名白名单里的低基数枚举
  //   或 "other" / ""。参照本 PR 为模板事件加的 *_name 自由文本键守卫风格。
  const fileType = (name: string): string => classifyDownloadFileType(name)

  it('keeps known extensions and normalizes case', () => {
    expect(fileType('photo.PNG')).toBe('png')
    expect(fileType('report.pdf')).toBe('pdf')
    expect(fileType('sheet.XLSX')).toBe('xlsx')
  })

  it('clamps CJK / free-text suffixes to "other", never leaking the raw fragment', () => {
    for (const name of ['机密.客户并购项目', 'report.内部资料', '2026Q3财报.客户机密并购项目', 'a.superlongsuffixstring']) {
      const ext = fileType(name)
      expect(ext).toBe('other')
      // 绝不等于原始片段,且不含任何非 [a-z0-9] 字符
      const rawFragment = name.slice(name.lastIndexOf('.') + 1)
      expect(ext).not.toBe(rawFragment)
      expect(ext).toMatch(/^[a-z0-9]+$/)
    }
  })

  it('reports empty string when there is no extension', () => {
    expect(fileType('README')).toBe('')
    expect(fileType('.env')).toBe('')
    expect(fileType('report.')).toBe('')
  })

  it('emits the clamped file_type through Dap.shared.track on download', async () => {
    mockTrack.mockClear()
    await downloadFile('/files/机密.客户并购项目', '机密.客户并购项目')

    expect(mockTrack).toHaveBeenCalledWith('message_file_downloaded', { file_type: 'other' })
    const calls = mockTrack.mock.calls
    const props = calls[calls.length - 1][1] as { file_type: string }
    expect(props.file_type).not.toContain('客户')
  })
})
