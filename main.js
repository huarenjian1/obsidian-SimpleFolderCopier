const { Plugin, PluginSettingTab, Setting, Notice } = require("obsidian");
const fs = require("node:fs").promises;
const path = require("node:path");

module.exports = class SimpleFolderCopier extends Plugin {
    async onload() {
        this.settings = Object.assign({
            sourceFolder: "",
            targetFolder: "",
            cleanTargetFirst: false
        }, await this.loadData() || {});

        this.addRibbonIcon("copy", "复制文件夹", async () => {
            await this.copyFolder();
        });

        this.addSettingTab(new CopierSettingTab(this.app, this));

        console.log("SimpleFolderCopier loaded");
    }

    async copyFolder() {
        const vaultBase = this.app.vault.adapter.basePath;
        const source = path.join(vaultBase, this.settings.sourceFolder);
        const target = this.settings.targetFolder;

        if (!this.settings.sourceFolder || !this.settings.targetFolder) {
            new Notice("请先在设置里配置源文件夹和目标文件夹");
            return;
        }

        try {
            if (this.settings.cleanTargetFirst) {
                new Notice("正在清空目标目录...");
                await fs.rm(target, { recursive: true, force: true });
            }

            await this.copyDirectoryRecursive(source, target);
            new Notice("复制完成");
        } catch (e) {
            console.error(e);
            new Notice(`复制失败: ${e.message}`);
        }
    }

    async copyDirectoryRecursive(srcDir, destDir) {
        await fs.mkdir(destDir, { recursive: true });

        const entries = await fs.readdir(srcDir, { withFileTypes: true });

        for (const entry of entries) {
            const srcPath = path.join(srcDir, entry.name);
            const destPath = path.join(destDir, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectoryRecursive(srcPath, destPath);
            } else if (entry.isFile()) {
                await fs.copyFile(srcPath, destPath);
            }
        }
    }

    onunload() {
        console.log("SimpleFolderCopier unloaded");
    }

    async loadSettings() {
        this.settings = Object.assign({}, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
};

class CopierSettingTab extends PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display() {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h2", { text: "Simple Folder Copier 设置" });

        new Setting(containerEl)
            .setName("源文件夹（相对路径）")
            .setDesc("相对于Vault根目录的文件夹，例如：notes")
            .addText(text => text
                .setPlaceholder("notes")
                .setValue(this.plugin.settings.sourceFolder || "")
                .onChange(async (value) => {
                    this.plugin.settings.sourceFolder = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("目标文件夹（绝对路径）")
            .setDesc("例如 C:\\backup\\notes")
            .addText(text => text
                .setPlaceholder("C:\\backup\\notes")
                .setValue(this.plugin.settings.targetFolder || "")
                .onChange(async (value) => {
                    this.plugin.settings.targetFolder = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName("清空目标目录")
            .setDesc("在复制前先清空目标目录以保持完全一致")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.cleanTargetFirst || false)
                .onChange(async (value) => {
                    this.plugin.settings.cleanTargetFirst = value;
                    await this.plugin.saveSettings();
                })
            );
    }
}
