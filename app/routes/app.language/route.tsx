import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Typography, Button, Space, Flex, Table, Switch } from "antd";
import { useEffect, useState } from "react";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useSubmit } from "@remix-run/react";
import "./styles.css";
import { authenticate } from "~/shopify.server";
import {
  mutationShopLocaleDisable,
  mutationShopLocaleEnable,
  mutationShopLocalePublish,
  mutationShopLocaleUnpublish,
  PublishInfoType,
  queryAllLanguages,
  queryAllMarket,
  queryShop,
  queryShopLanguages,
  UnpublishInfoType,
} from "~/api/admin";
// import { translateAll, updateUserInfo } from "~/api/serve";
import { useDispatch, useSelector } from "react-redux";
import {
  setPublishConfirmState,
  setPublishLoadingState,
  setPublishState,
  setTableData,
} from "~/store/modules/languageTableData";
import AttentionCard from "~/components/attentionCard";
import PrimaryLanguage from "./components/primaryLanguage";
import AddLanguageModal from "./components/addLanguageModal";
import PublishModal from "./components/publishModal";

const { Title } = Typography;

export interface ShopLocalesType {
  locale: string;
  name: string;
  primary: boolean;
  published: boolean;
}

export interface AllLanguagesType {
  key: number;
  isoCode: string;
  name: string;
}

export interface LanguagesDataType {
  key: number;
  language: string;
  locale: string;
  primary: boolean;
  status: number;
  auto_update_translation: boolean;
  published: boolean;
  loading: boolean;
}

export interface MarketType {
  name: string;
  primary: boolean;
  webPresences: {
    nodes: [
      {
        id: string;
      },
    ];
  };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const adminAuthResult = await authenticate.admin(request)
    const {shop} = adminAuthResult.session
    // try {
    //   // 登录成功后调用 updateUserInfo 更新用户信息
    //   await updateUserInfo(request);
    // } catch (error) {
    //   console.error("Error updating user info:", error);
    // }
    const shopLanguages: ShopLocalesType[] = await queryShopLanguages(request);
    const allMarket: MarketType[] = await queryAllMarket(request);
    let allLanguages: AllLanguagesType[] = await queryAllLanguages(request);

    allLanguages = allLanguages.map((language, index) => ({
      ...language,
      key: index,
    }));
    return json({ shop, shopLanguages, allLanguages, allMarket });
  } catch (error) {
    console.error("Error load languages:", error);
    throw new Response("Error load languages", { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const formData = await request.formData();
    const languages: string[] = JSON.parse(formData.get("languages") as string); // 获取语言数组
    const selectedLanguage: ShopLocalesType = JSON.parse(
      formData.get("selectedLanguage") as string,
    );
    const publishInfo: PublishInfoType = JSON.parse(
      formData.get("publishInfo") as string,
    );
    const unPublishInfo: UnpublishInfoType = JSON.parse(
      formData.get("unPublishInfo") as string,
    );
    const deleteData: LanguagesDataType[] = JSON.parse(
      formData.get("deleteData") as string,
    );

    if (languages) {
      await mutationShopLocaleEnable({ request, languages }); // 处理逻辑
      const shopLanguages: ShopLocalesType[] =
        await queryShopLanguages(request);
      return json({ success: true, shopLanguages });
    }

    if (selectedLanguage) {
      const locale = selectedLanguage.locale;
      // await translateAll({ request, locale });
      return null;
    }

    if (publishInfo) {
      await mutationShopLocalePublish({ request, publishInfos: [publishInfo] });
      return null;
    }

    if (unPublishInfo) {
      await mutationShopLocaleUnpublish({
        request,
        publishInfos: [unPublishInfo],
      });
      return null;
    }

    if (deleteData) {
      await mutationShopLocaleDisable({
        request,
        languages: deleteData,
      });
      return null;
    }
    return null;
  } catch (error) {
    console.error("Error action language:", error);
    return json({ error: "Error action language" }, { status: 500 });
  }
};

const Index = () => {
  const { shop, shopLanguages, allLanguages, allMarket } =
    useLoaderData<typeof loader>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]); //表格多选控制key
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false); // 控制Modal显示的状态
  const [selectedRow, setSelectedRow] = useState<
    LanguagesDataType | undefined
  >();
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false); // 控制Modal显示的状态
  const [deleteloading, setDeleteLoading] = useState(false);
  const [publishMarket, setPublishMarket] = useState<string>();
  const [publishInfo, setPublishInfo] = useState<PublishInfoType>();
  const [unPublishInfo, setUnpublishInfo] = useState<UnpublishInfoType>();
  const dataSource: LanguagesDataType[] = useSelector(
    (state: any) => state.languageTableData.rows,
  );

  // const publishLanguages = dataSource.map((item) => ({
  //   value: item.language,
  //   label: item.language,
  //   disabled: false,
  // })); //语言选择器数据

  const dispatch = useDispatch();
  const submit = useSubmit(); // 使用 useSubmit 钩子

  const typeTrans = () => {
    const newdata = shopLanguages.filter((language) => !language.primary);
    const data = newdata.map((lang, i) => ({
      key: i,
      language: lang.name,
      locale: lang.locale,
      primary: lang.primary,
      status: 1,
      auto_update_translation: false,
      published: lang.published,
      loading: false,
    }));
    return data;
  };

  useEffect(() => {
    const data = typeTrans();
    dispatch(setTableData(data));
  }, [shopLanguages]);

  useEffect(() => {
    const formData = new FormData();
    formData.append("publishInfo", JSON.stringify(publishInfo)); // 将选中的语言作为字符串发送
    submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
  }, [publishInfo]);

  useEffect(() => {
    const formData = new FormData();
    formData.append("unPublishInfo", JSON.stringify(unPublishInfo)); // 将选中的语言作为字符串发送
    submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
  }, [unPublishInfo]);

  const handleOpenModal = () => {
    setIsLanguageModalOpen(true); // 打开Modal
  };

  const handleAutoUpdateChange = (key: number, checked: boolean) => {};

  const handlePublishChange = (key: number, checked: boolean) => {
    const row = dataSource.find((item: any) => item.key === key);

    if (checked) {
      dispatch(setPublishLoadingState({ key, loading: checked }));
      setSelectedRow(row);
      setIsPublishModalOpen(true);
    } else {
      dispatch(setPublishState({ key, published: checked }));
      if (row)
        setUnpublishInfo({
          locale: row.locale,
          shopLocale: { published: false },
        });
    }
  };

  const handleTranslate = async (key: number) => {
    const selectedKey = dataSource.find(
      (item: { key: number }) => item.key === key,
    );
    if (selectedKey) {
      const selectedLanguage = shopLanguages.find(
        (item) => item.name === selectedKey.language,
      );
      if (selectedLanguage) {
        const formData = new FormData();
        formData.append("selectedLanguage", JSON.stringify(selectedLanguage)); // 将选中的语言作为字符串发送
        submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求
      }
    }
  };

  const handleConfirmPublishModal = () => {
    if (selectedRow) {
      dispatch(
        setPublishConfirmState({
          key: selectedRow?.key,
          published: true,
          loading: false,
        }),
      );
      if (selectedRow.locale && publishMarket) {
        setPublishInfo({
          locale: selectedRow.locale,
          shopLocale: { published: true, marketWebPresenceIds: publishMarket },
        });
      }
    }
    setIsPublishModalOpen(false); // 关闭Modal
  };

  const handleClosePublishModal = () => {
    if (selectedRow) {
      dispatch(
        setPublishLoadingState({ key: selectedRow?.key, loading: false }),
        setSelectedRow(undefined),
      );
    }
    setIsPublishModalOpen(false); // 关闭Modal
  };

  const columns = [
    {
      title: "Language",
      dataIndex: "language",
      key: "language",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
    },
    {
      title: "Auto Update Translation",
      dataIndex: "auto_update_translation",
      key: "auto_update_translation",
      render: (_: any, record: any) => {
        return (
          <Switch
            checked={record.auto_update_translation}
            onChange={(checked) => handleAutoUpdateChange(record.key, checked)}
          />
        );
      },
    },
    {
      title: "Publish",
      dataIndex: "published",
      key: "published",
      render: (_: any, record: any) => (
        <Switch
          checked={record.published}
          onChange={(checked) => handlePublishChange(record.key, checked)}
          loading={record.loading} // 使用每个项的 loading 状态
        />
      ),
    },
    {
      title: "Action",
      dataIndex: "action",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => handleTranslate(record.key)}>翻译</Button>
          <Button>设置</Button>
        </Space>
      ),
    },
  ];

  //表格编辑
  const handleDelete = () => {
    const newData = dataSource.filter(
      (item: LanguagesDataType) => !selectedRowKeys.includes(item.key),
    );
    const deleteData = dataSource.filter((item: LanguagesDataType) =>
      selectedRowKeys.includes(item.key),
    );

    const formData = new FormData();
    formData.append("deleteData", JSON.stringify(deleteData)); // 将选中的语言作为字符串发送
    submit(formData, { method: "post", action: "/app/language" }); // 提交表单请求

    dispatch(setTableData(newData)); // 更新表格数据
    setSelectedRowKeys([]); // 清空已选中项
  };

  const onSelectChange = (newSelectedRowKeys: any) => {
    console.log("selectedRowKeys changed: ", newSelectedRowKeys);
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const hasSelected = selectedRowKeys.length > 0;

  const PreviewClick = () => {
    const shopUrl = `https://${shop}`;
    window.open(shopUrl, "_blank", "noopener,noreferrer");
  }; //新页面预览商店

  return (
    <Page>
      <TitleBar title="Language" />
      <Space direction="vertical" size="middle" style={{ display: "flex" }}>
        <AttentionCard
          title="Translation word credits have been exhausted."
          content="The translation cannot be completed due to exhausted credits."
          buttonContent="Get more word credits"
        />
        <div className="language-header">
          <Title style={{ fontSize: "1.25rem", display: "inline" }}>
            Languages
          </Title>
          <div className="language-action">
            <Space>
              <Button type="default" onClick={PreviewClick}>
                Preview store
              </Button>
              <Button type="primary" onClick={handleOpenModal}>
                Add Language
              </Button>
            </Space>
          </div>
        </div>
        <PrimaryLanguage shopLanguages={shopLanguages} />
        <Flex gap="middle" vertical>
          <Flex align="center" gap="middle">
            <Button
              type="primary"
              onClick={handleDelete}
              disabled={!hasSelected}
              loading={deleteloading}
            >
              Delete
            </Button>
            {hasSelected ? `Selected ${selectedRowKeys.length} items` : null}
          </Flex>
          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={dataSource}
          />
        </Flex>
      </Space>
      <AddLanguageModal
        isVisible={isLanguageModalOpen}
        setIsModalOpen={setIsLanguageModalOpen}
        allLanguages={allLanguages}
        submit={submit}
      />
      <PublishModal
        isVisible={isPublishModalOpen} // 父组件控制是否显示
        onOk={() => handleConfirmPublishModal()}
        onCancel={() => handleClosePublishModal()}
        setPublishMarket={setPublishMarket}
        selectedRow={selectedRow}
        allMarket={allMarket}
      />
    </Page>
  );
};

export default Index;
