/**
 * バッチ 1 段の結果。段は 1 件失敗しても他の行を処理し続ける（per-row isolation）が、
 * 「止めない」と「成功として報告する」は別。件数を呼出し元へ返し、
 * {@link DokusyaApplyDueService} が全段ぶんを集計して ng>0 なら throw する
 * → runBatch が exit(1) → EventBridge / ECS が失敗を検知できる。
 */
export interface BatchStageResult {
  ok: number;
  ng: number;
}
