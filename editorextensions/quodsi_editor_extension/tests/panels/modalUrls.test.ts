import { advisorModalUrl } from '../../src/panels/modalUrls';
import { studiesModalUrl } from '../../src/panels/modalUrls';

// Spec 2026-10-16: the Advisor modal learns the model's project; Open lands on Project.
describe('modal URLs', () => {
  it('the Advisor URL carries the model, document and page ids when known', () => {
    const url = advisorModalUrl({ focusType: 'Generator', focusId: 'g1', modelId: 'm-1', documentId: 'd 1', pageId: 'p1', apiBaseUrl: 'https://api' });
    expect(url).toContain('view=advisor');
    expect(url).toContain('modelId=m-1');
    expect(url).toContain('documentId=d%201');
    expect(url).toContain('pageId=p1');
  });
  it('omits them when unknown', () => {
    expect(advisorModalUrl({ apiBaseUrl: '' })).not.toContain('modelId=');
  });
  it('the Studies URL can start on the Project tab', () => {
    expect(studiesModalUrl({ modelId: 'm-1', tab: 'project', apiBaseUrl: '' })).toContain('tab=project');
    expect(studiesModalUrl({ apiBaseUrl: '' })).not.toContain('tab=');
  });
  it('the Studies URL carries the document id (the tour runs in its owning document only)', () => {
    expect(studiesModalUrl({ documentId: 'd 1', apiBaseUrl: '' })).toContain('documentId=d%201');
    expect(studiesModalUrl({ apiBaseUrl: '' })).not.toContain('documentId=');
  });
});
