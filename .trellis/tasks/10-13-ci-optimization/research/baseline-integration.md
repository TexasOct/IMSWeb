# 验收基线同步

四个实施阶段在 375820be0a1989ff5d356bc707434e5a58689661 交付后，主会话将独立任务分支快进到已提交的 release/v1.1 447f2323a6ef28931b80e73750336b710ea21e49。新提交涉及129个路径，新增交换地图及原生检查；最终浏览器和单测清单必须按同步后的源码重新核对，旧清单158 core、10 extended、83 App仅作为历史交接。

主检出目录未提交的名片设计和 build scripts 删除均未进入同步来源。同步前完整保存任务 dirty/untracked 文件及 modes、tracked binary diff、重叠测试的 base/task patch，另保存主检出目录 HEAD、porcelain、暂存条目的 mode/blob/stage 摘要和 dirty/untracked 内容指纹。

唯一重叠路径为 tests/tauri-build-configuration.test.js。本轮两个已保存的 CI 测试变更临时恢复到原基线后，git merge --ff-only 使用固定 source SHA 完成快进，再恢复两个原有变更。新增原生 icon/command 断言随 release 保留，没有制造本任务提交。

同步后核对：HEAD为447f2323；其他全部本轮dirty/untracked文件字节与modes一致；重叠测试diff hunks与保存patch一致；任务暂存区为空；主检出目录HEAD、porcelain、全部dirty/untracked指纹及暂存条目摘要均未变化。

本地完整快照与机器可读回执：/var/folders/z1/x_q902n155vc8_nypm6nw_sc0000gn/T/imsweb-ci-integration-p9lcnca8。该目录为本地恢复证据，不作为长期保存或托管 CI 结果。最终验收应绑定当前源码指纹，保留首次失败和清理回执，不能用旧交接日志代替新树验收。
